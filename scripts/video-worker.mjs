import { makeReferencePlan, referenceInput, REFERENCE_MODELS } from "../lib/higgsfield-reference.mjs";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { makeShotPlan, validateShotPlan, buildGenerationCommand } from "../lib/video-shot-plan.mjs";
import { assembleVideo, outputDimensions } from "../lib/video-assembly.mjs";
import { loadMusicLibrary, musicMoodFor, pickMusicTrack } from "../lib/music.mjs";
import { castPhotos, createPhotoAnalyzer, photoLabel, validAnalysis } from "../lib/photo-analysis.mjs";
import { createDirector } from "../lib/director.mjs";
import { makeKlingShotPlan, klingRequest } from "../lib/kling-shot-plan.mjs";
import { createHiggsfieldClient, higgsfieldModel as hfModel, higgsfieldInput, HIGGSFIELD_PROVIDER } from "../lib/higgsfield-api.mjs";
import { createKlingClient } from "../lib/kling-client.mjs";

const execFileAsync = promisify(execFile);
const args = new Set(process.argv.slice(2));
const once = args.has("--once");
const dryRun = args.has("--dry-run");
const resumeProjectId = process.argv.find((arg) => arg.startsWith("--resume-project="))?.split("=")[1];
if (resumeProjectId && !/^\d+$/.test(resumeProjectId)) throw new Error("Invalid resume project ID.");
const promptOnly = args.has("--prompt-only");
const higgsfieldApiOnly = args.has("--higgsfield-api-only");
const klingOnly = args.has("--kling-only");
const pollMs = Number(process.env.VIDEO_WORKER_POLL_MS ?? 5000);
const higgsfieldModel = process.env.HIGGSFIELD_VIDEO_MODEL ?? "seedance_2_0";
const higgsfieldResolution = process.env.HIGGSFIELD_VIDEO_RESOLUTION ?? "720p";
const higgsfieldWaitTimeout = process.env.HIGGSFIELD_WAIT_TIMEOUT ?? "30m";
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME ?? "homie";
const musicLibraryDir = process.env.MUSIC_LIBRARY_DIR ?? new URL("../assets/music/", import.meta.url).pathname;
const isConfiguredSecret = (value) => Boolean(value && !/^(your-|replace-|example)/i.test(value));
const hasR2Credentials = [r2AccountId, r2AccessKeyId, r2SecretAccessKey].every(isConfiguredSecret);

if (!supabaseUrl || !serviceKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) for the video worker.");
}
const db = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const r2 = hasR2Credentials ? new S3Client({
  region: "auto",
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
}) : null;


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checked(query) {
  const result = await query;
  if (result.error) throw result.error;
  return result;
}

async function event(projectId, stage, message, progress, metadata = {}) {
  await checked(db.from("generation_events").insert({
    video_project_id: projectId,
    stage,
    message,
    progress,
    metadata,
  }));
  await checked(db.from("video_projects").update({ generation_progress: progress }).eq("id", projectId));
}

async function claimNextProject() {
  let query = db
    .from("video_projects")
    .select("id, status, workspace_id, duration_seconds, output_format, template_prompt_snapshot, video_templates(slug, generation_config), video_project_photos(sort_order, listing_photos(id, storage_path, source_url, room_type, metadata)), video_project_shots(shot_order, status, output_url, provider_job_id, provider_metadata)");
  if (resumeProjectId) query = query.eq("id", Number(resumeProjectId)).eq("status", "failed");
  else query = query.eq("status", "queued");
  if (higgsfieldApiOnly) query = query.eq("template_prompt_snapshot->>provider", HIGGSFIELD_PROVIDER);
  if (klingOnly) query = query.eq("template_prompt_snapshot->>provider", "kling");
  if (promptOnly) query = query.eq("template_prompt_snapshot->>workflow", "prompt_property_film");
  const { data: queued, error } = await query
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!queued) return null;
  if (dryRun) return queued;
  // Fail before claiming/debiting any further work when server credentials are missing.
  if (queued.template_prompt_snapshot?.provider === "kling") getKlingClient();
  else if (queued.template_prompt_snapshot?.provider === HIGGSFIELD_PROVIDER) getHiggsfieldClient();
  else await execFileAsync("higgsfield", ["account", "status"]);

  const { data: claimed, error: claimError } = await db
    .from("video_projects")
    .update({ status: "generating", generation_progress: 1, generation_error: null })
    .eq("id", queued.id)
    .eq("status", queued.status)
    .select("id")
    .maybeSingle();
  if (claimError) throw claimError;
  return claimed ? queued : null;
}

async function materializePhoto(photo, directory, index) {
  const path = join(directory, `photo-${String(index).padStart(2, "0")}.jpg`);
  let bytes;
  if (photo.storage_path) {
    const { data, error } = await db.storage.from("listing-photos").download(photo.storage_path);
    if (error) throw error;
    bytes = Buffer.from(await data.arrayBuffer());
  } else if (photo.source_url) {
    const response = await fetch(photo.source_url);
    if (!response.ok) throw new Error(`Could not download listing photo (${response.status}).`);
    bytes = Buffer.from(await response.arrayBuffer());
  } else {
    throw new Error("Listing photo has no usable source.");
  }
  await writeFile(path, bytes);
  return { path, roomType: photo.room_type ?? null, metadata: photo.metadata ?? {} };
}

const analyzePhoto = createPhotoAnalyzer();
const director = createDirector();

// The director picks photos per shot and rewrites each shot prompt for this home.
// Its plan is saved on the project so a resumed render reuses the exact same prompts.
async function directProject(project, photos) {
  const config = project.template_prompt_snapshot ?? {};
  const plannerSupportsShots = [HIGGSFIELD_PROVIDER, "kling"].includes(config.provider) && config.generation_mode !== "reference";
  if (!director || !plannerSupportsShots || config.workflow === "prompt_property_film" || config.director === false) return null;
  // A saved plan is reused even from an older director version: its shots may already be paid for.
  const saved = config.director_plan;
  if (Array.isArray(saved?.shots) && saved.photo_count === photos.length && saved.duration === project.duration_seconds) return saved;
  // Shots already submitted under the template's own plan must keep their prompts.
  if ((project.video_project_shots ?? []).some((shot) => shot.provider_job_id || shot.provider_metadata?.submission_attempted)) return null;
  await event(project.id, "planning", "Directing the shots for this home", 9);
  let plan;
  try {
    plan = await director({ config, slug: config.template_slug ?? project.video_templates?.slug, photos, duration: project.duration_seconds, aspectRatio: project.output_format });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Director failed for project ${project.id}:`, message);
    await event(project.id, "planning", "Director unavailable; using the template's own shot plan", 9, { error: message.slice(0, 300) });
    return null;
  }
  project.template_prompt_snapshot = { ...config, director_plan: plan };
  await checked(db.from("video_projects").update({ template_prompt_snapshot: project.template_prompt_snapshot }).eq("id", project.id));
  await event(project.id, "planning", plan.notes || "Shot list ready", 10, { shots: plan.shots.map(({ role, duration, start_photo_index, end_photo_index }) => ({ role, duration, start_photo_index, end_photo_index })), skipped_photos: plan.skipped_photos });
  return plan;
}

// Classifies each photo once (cached on the listing photo), then labels it for the planners.
async function analyzePhotos(project, photoRows, photos) {
  const missing = photos.map((photo, index) => ({ photo, row: photoRows[index].listing_photos })).filter(({ photo }) => !validAnalysis(photo.metadata.photo_analysis));
  if (missing.length && !analyzePhoto) {
    await event(project.id, "planning", "Photo analysis is not configured; using the saved photo order", 6);
  } else if (missing.length) {
    await event(project.id, "planning", `Analyzing ${missing.length} property photos`, 6);
    for (let i = 0; i < missing.length; i += 4) {
      await Promise.all(missing.slice(i, i + 4).map(async ({ photo, row }) => {
        try {
          const analysis = await analyzePhoto(photo.path);
          photo.metadata = { ...photo.metadata, photo_analysis: analysis };
          await checked(db.from("listing_photos").update({ metadata: photo.metadata }).eq("id", row.id));
        } catch (error) {
          console.error(`Photo ${row.id} analysis failed:`, error instanceof Error ? error.message : error);
        }
      }));
    }
  }
  return photos.map((photo) => {
    const analysis = validAnalysis(photo.metadata.photo_analysis) ? photo.metadata.photo_analysis : null;
    return { ...photo, analysis, roomType: photoLabel(photo.roomType, analysis) };
  });
}


async function runHiggsfield(shot, aspectRatio) {
  const command = buildGenerationCommand(shot, aspectRatio, higgsfieldWaitTimeout);
  // Never retry a create call: a lost response may already represent a paid job.
  const { stdout } = await execFileAsync("higgsfield", command, { maxBuffer: 10 * 1024 * 1024 });
  const payload = JSON.parse(stdout);
  const job = Array.isArray(payload) ? payload[0] : Array.isArray(payload?.jobs) ? payload.jobs[0] : payload;
  const outputUrl = job?.result?.url ?? job?.result?.video_url ?? job?.result_url ?? job?.min_result_url ?? job?.output_url ?? job?.url;
  const jobId = job?.id ?? job?.job_id;
  if (job?.status && !["completed", "ready", "succeeded", "success"].includes(job.status)) {
    throw new Error(`Higgsfield job ended with status ${job.status}.`);
  }
  if (!outputUrl) throw new Error("Higgsfield completed without a video URL.");
  return { outputUrl, jobId, raw: job };
}

let higgsfieldApiClient;
function getHiggsfieldClient() {
  return higgsfieldApiClient ??= createHiggsfieldClient({ keyId: process.env.HF_API_KEY_ID, keySecret: process.env.HF_API_KEY_SECRET });
}
let klingClient;
function getKlingClient() {
  return klingClient ??= createKlingClient({ apiKey: process.env.KLING_API_KEY, baseUrl: process.env.KLING_API_BASE_URL });
}

function planProject(project, photos) {
  if (project.template_prompt_snapshot?.provider === HIGGSFIELD_PROVIDER && project.template_prompt_snapshot?.generation_mode === "reference") return makeReferencePlan(project, photos);
  if (project.template_prompt_snapshot?.provider === HIGGSFIELD_PROVIDER) return makeKlingShotPlan(project, photos).map(shot => ({ ...shot, provider: HIGGSFIELD_PROVIDER, model: hfModel(shot.resolution), generateAudio: true }));
  if (project.template_prompt_snapshot?.provider === "kling") return makeKlingShotPlan(project, photos);
  const shots = makeShotPlan(project, photos, { higgsfieldModel, higgsfieldResolution });
  validateShotPlan(shots, project.output_format);
  return shots;
}

async function prepareKlingFrame(path, aspectRatio, directory, name) {
  const [width, height] = outputDimensions("1080p", aspectRatio);
  const frame = join(directory, `${name}.jpg`);
  await execFileAsync("ffmpeg", ["-nostdin", "-v", "error", "-y", "-i", path, "-frames:v", "1", "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`, "-q:v", "2", frame], { timeout: 60000 });
  const bytes = await readFile(frame);
  if (bytes.length > 50 * 1024 * 1024) throw new Error("Kling reference image exceeds 50 MB.");
  return bytes.toString("base64");
}

async function generateShot(shot, project, directory, storedShot) {
  if (shot.provider === HIGGSFIELD_PROVIDER) return generateHiggsfieldApiShot(shot, project, directory, storedShot);
  if (shot.provider !== "kling") return runHiggsfield(shot, project.output_format);
  const firstFrame = await prepareKlingFrame(shot.startPath, project.output_format, directory, `kling-${shot.order}-first`);
  const lastFrame = shot.endPath ? await prepareKlingFrame(shot.endPath, project.output_format, directory, `kling-${shot.order}-last`) : undefined;
  const body = klingRequest(shot, firstFrame, lastFrame);
  const fingerprint = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const prior = storedShot?.provider_metadata ?? {};
  if (prior.request_fingerprint && prior.request_fingerprint !== fingerprint) throw new Error("This Kling shot changed after submission. Create a new video version instead of reusing its task.");
  const externalId = prior.external_id ?? `homie-${project.id}-${shot.order}-${fingerprint.slice(0, 16)}`;
  const metadata = { ...prior, provider: "kling", external_id: externalId, request_fingerprint: fingerprint, submission_attempted: true, planner_version: shot.plannerVersion, generated_seconds: shot.duration };
  // Save the intent BEFORE the network call. A lost POST response must never
  // become a second paid generation on retry.
  await checked(db.from("video_project_shots").update({ provider_metadata: metadata }).eq("video_project_id", project.id).eq("shot_order", shot.order));
  const result = await getKlingClient().run({ body, externalId, taskId: storedShot?.provider_job_id, previouslySubmitted: Boolean(prior.submission_attempted),
    onSubmitted: async (taskId) => checked(db.from("video_project_shots").update({ provider_job_id: taskId, provider_metadata: metadata }).eq("video_project_id", project.id).eq("shot_order", shot.order)),
  });
  result.raw = { ...metadata, ...result.raw };
  return result;
}

async function generateHiggsfieldApiShot(shot, project, directory, storedShot) {
  const client = getHiggsfieldClient();
  const prior = storedShot?.provider_metadata ?? {};
  if (prior.submission_attempted && !storedShot?.provider_job_id) throw new Error("Reconcile the previous Higgsfield submission in the console before retrying.");
  const isReference = REFERENCE_MODELS.has(shot.model);
  const references = [];
  if (isReference) for (const [i, path] of shot.referencePaths.entries()) references.push(await prepareKlingFrame(path, shot.generationAspectRatio, directory, `reference-${i}`));
  const first = isReference ? undefined : await prepareKlingFrame(shot.startPath, project.output_format, directory, `hf-${shot.order}-first`);
  const last = shot.endPath ? await prepareKlingFrame(shot.endPath, project.output_format, directory, `hf-${shot.order}-last`) : undefined;
  const fingerprint = createHash("sha256").update(JSON.stringify({ model: shot.model, input: isReference ? referenceInput(shot, references) : higgsfieldInput(shot, first, last) })).digest("hex");
  if (prior.request_fingerprint && prior.request_fingerprint !== fingerprint) throw new Error("Higgsfield shot changed after submission; create a new version.");
  const idempotencyKey = prior.external_id ?? `homie-${project.id}-${shot.order}-${fingerprint.slice(0, 16)}`;
  const uploadedReferences = [];
  if (isReference && !storedShot?.provider_job_id) for (const image of references) uploadedReferences.push(await client.upload(Buffer.from(image, "base64")));
  const body = storedShot?.provider_job_id ? undefined : isReference ? referenceInput(shot, uploadedReferences) : higgsfieldInput(shot, await client.upload(Buffer.from(first, "base64")), last ? await client.upload(Buffer.from(last, "base64")) : undefined);
  const metadata = { ...prior, provider: HIGGSFIELD_PROVIDER, external_id: idempotencyKey, request_fingerprint: fingerprint, submission_attempted: true, generated_seconds: shot.duration };
  await checked(db.from("video_project_shots").update({ provider_metadata: metadata }).eq("video_project_id", project.id).eq("shot_order", shot.order));
  const result = await client.run({ model: shot.model, body, taskId: storedShot?.provider_job_id, statusUrl: prior.status_url, previouslySubmitted: prior.submission_attempted, idempotencyKey,
    onSubmitted: async (id, statusUrl) => checked(db.from("video_project_shots").update({ provider_job_id: id, provider_metadata: { ...metadata, status_url: statusUrl } }).eq("video_project_id", project.id).eq("shot_order", shot.order)),
  });
  result.raw = { ...metadata, ...result.raw };
  return result;
}

async function download(url, path) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download generated clip (${response.status}).`);
  await writeFile(path, Buffer.from(await response.arrayBuffer()));
}


// Tracks are read from MUSIC_LIBRARY_DIR when present locally, otherwise from R2 under music/
// (S3 API when credentials are configured, Wrangler otherwise, matching uploadFinalVideo).
async function materializeMusic(track, directory) {
  const localPath = join(musicLibraryDir, track.file);
  try {
    await access(localPath);
    return { ...track, path: localPath };
  } catch {}
  const path = join(directory, `music-${track.file.replaceAll("/", "_")}`);
  if (r2) {
    const object = await r2.send(new GetObjectCommand({ Bucket: r2Bucket, Key: `music/${track.file}` }));
    await writeFile(path, Buffer.from(await object.Body.transformToByteArray()));
  } else {
    await execFileAsync("npx", ["wrangler", "r2", "object", "get", `${r2Bucket}/music/${track.file}`, "--file", path, "--remote"], { maxBuffer: 10 * 1024 * 1024 });
  }
  return { ...track, path };
}

async function uploadFinalVideo(project, finalPath, storagePath) {
  if (r2) {
    await r2.send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: storagePath,
      Body: await readFile(finalPath),
      ContentType: "video/mp4",
      CacheControl: "private, max-age=3600",
      Metadata: { project_id: String(project.id), workspace_id: String(project.workspace_id), version: "1" },
    }));
    return;
  }

  const objectPath = `${r2Bucket}/${storagePath}`;
  const uploadArgs = [
    "wrangler", "r2", "object", "put", objectPath,
    "--file", finalPath,
    "--content-type", "video/mp4",
    "--cache-control", "private, max-age=3600",
  ];
  await execFileAsync("npx", [...uploadArgs, "--remote"], { maxBuffer: 10 * 1024 * 1024 });
  if (process.env.R2_SEED_LOCAL !== "0") {
    await execFileAsync("npx", [...uploadArgs, "--local"], { maxBuffer: 10 * 1024 * 1024 });
  }
}

async function processProject(project) {
  const directory = await mkdtemp(join(tmpdir(), `homie-video-${project.id}-`));
  try {
    const photoRows = [...(project.video_project_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    if (!photoRows.length) throw new Error("At least 1 project photo is required.");
    const placeholderPhotos = photoRows.map((row, index) => ({ path: `photo-${index}.jpg`, roomType: row.listing_photos?.room_type }));
    const preflightShots = planProject(project, placeholderPhotos);
    if (dryRun) {
      console.log(JSON.stringify({ projectId: project.id, shots: preflightShots.map(({ role, duration, editDuration, model, resolution }) => ({ role, duration, editDuration, model, resolution })), valid: true }));
      return;
    }
    await event(project.id, "planning", "Planning the property route", 5);
    const photos = [];
    for (let index = 0; index < photoRows.length; index += 1) {
      photos.push(await materializePhoto(photoRows[index].listing_photos, directory, index));
    }
    const analyzed = await analyzePhotos(project, photoRows, photos);
    const directorPlan = await directProject(project, analyzed);
    const config = project.template_prompt_snapshot ?? {};
    let shots;
    let photoOrder;
    if (directorPlan) {
      shots = planProject({ ...project, template_prompt_snapshot: { ...config, shots: directorPlan.shots, director_plan_applied: true } }, analyzed);
      photoOrder = directorPlan.shots.map((shot) => ({ index: shot.start_photo_index, end_index: shot.end_photo_index ?? null, label: analyzed[shot.start_photo_index].roomType }));
    } else {
      // A user-written brief promises the saved photo order; templates get casted photos.
      const cast = config.workflow === "prompt_property_film" || config.photo_casting === false
        ? analyzed
        : castPhotos(analyzed, config.template_slug ?? project.video_templates?.slug);
      photoOrder = cast.map((photo) => ({ index: analyzed.indexOf(photo), label: photo.roomType }));
      if (cast.some((photo, index) => photo !== analyzed[index])) await event(project.id, "planning", "Matched photos to the template's shots", 8, { photo_order: photoOrder });
      shots = planProject(project, cast);
    }

    const clipPaths = [];
    const outputs = [];
    const completedShots = new Map(
      (project.video_project_shots ?? [])
        .filter((storedShot) => storedShot.status === "ready" && storedShot.output_url)
        .map((storedShot) => [storedShot.shot_order, storedShot]),
    );
    for (const shot of shots) {
      const startProgress = 10 + Math.round((shot.order / shots.length) * 65);
      const completedShot = completedShots.get(shot.order);
      let result = completedShot ? {
        outputUrl: completedShot.output_url,
        jobId: completedShot.provider_job_id,
        raw: completedShot.provider_metadata,
      } : null;
      if (result) {
        await event(project.id, "generating", `Reusing completed shot ${shot.order + 1} of ${shots.length}`, startProgress, { role: shot.role, resumed: true });
      } else {
        await event(project.id, "generating", `Generating shot ${shot.order + 1} of ${shots.length}`, startProgress, { role: shot.role });
        await checked(db.from("video_project_shots").upsert({
          video_project_id: project.id,
          shot_order: shot.order,
          role: shot.role,
          duration_seconds: shot.duration,
          prompt: shot.prompt,
          model: shot.model,
          status: "generating",
          error_message: null,
        }, { onConflict: "video_project_id,shot_order" }));
        try {
          result = await generateShot(shot, project, directory, (project.video_project_shots ?? []).find((stored) => stored.shot_order === shot.order));
        } catch (error) {
          await checked(db.from("video_project_shots").update({
            status: "failed",
            error_message: error instanceof Error ? error.message : String(error),
          }).eq("video_project_id", project.id).eq("shot_order", shot.order));
          throw error;
        }
      }
      outputs.push(result.outputUrl);
      await checked(db.from("video_project_shots").upsert({
        video_project_id: project.id,
        shot_order: shot.order,
        role: shot.role,
        duration_seconds: shot.duration,
        prompt: shot.prompt,
        model: shot.model,
        provider_job_id: result.jobId ?? null,
        output_url: result.outputUrl,
        status: "ready",
        provider_metadata: result.raw ?? {},
      }, { onConflict: "video_project_id,shot_order" }));
      const clipPath = join(directory, `clip-${String(shot.order).padStart(2, "0")}.mp4`);
      await download(result.outputUrl, clipPath);
      clipPaths.push(clipPath);
    }

    await event(project.id, "editing", "Assembling and normalizing the final tour", 82);
    // The director decides whether this film needs music and its mood; otherwise the template's mood applies.
    const musicChoice = directorPlan?.music;
    const musicProject = musicChoice ? { ...project, template_prompt_snapshot: { ...project.template_prompt_snapshot, music: project.template_prompt_snapshot?.music !== false && musicChoice.use_music, music_mood: musicChoice.mood } } : project;
    const track = pickMusicTrack(musicProject, await loadMusicLibrary());
    if (musicChoice && !musicChoice.use_music) await event(project.id, "editing", "Director chose no background music", 84, { reason: musicChoice.reason });
    else if (!track && musicMoodFor(musicProject)) await event(project.id, "editing", "No soundtrack in the music library yet; finishing without music", 84, { music_mood: musicMoodFor(musicProject) });
    const music = track ? await materializeMusic(track, directory) : null;
    const finalPath = join(directory, `homie-${project.id}.mp4`);
    await assembleVideo(clipPaths, shots, finalPath, { duration: project.duration_seconds, aspectRatio: project.output_format, resolution: shots[0].resolution, music });
    const storagePath = `videos/${project.workspace_id}/${project.id}/version-1.mp4`;
    await event(project.id, "uploading", "Uploading the finished video to Cloudflare R2", 92);
    await uploadFinalVideo(project, finalPath, storagePath);

    await checked(db.from("video_versions").upsert({
      video_project_id: project.id,
      version_number: 1,
      status: "ready",
      video_url: null,
      duration_seconds: project.duration_seconds,
      provider_metadata: { provider: shots[0]?.provider, storage_provider: "cloudflare-r2", bucket: r2Bucket, r2_key: storagePath, model: shots[0]?.model, shot_outputs: outputs, generated_seconds: shots.reduce((sum, shot) => sum + shot.duration, 0), shot_plan: shots.map((shot) => ({ order: shot.order, duration: shot.duration, model: shot.model, provider: shot.provider })), photo_order: photoOrder, director: directorPlan ? { version: directorPlan.version, model: directorPlan.model, notes: directorPlan.notes } : null, music: track ? { id: track.id, title: track.title ?? null, artist: track.artist ?? null, license: track.license, mood: musicMoodFor(musicProject), chosen_by: musicChoice ? "director" : "template" } : null, prompt_recipe: project.template_prompt_snapshot },
      completed_at: new Date().toISOString(),
    }, { onConflict: "video_project_id,version_number" }));
    await event(project.id, "ready", "Video ready for review", 100);
    await checked(db.from("video_projects").update({ status: "awaiting_approval", generation_progress: 100 }).eq("id", project.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!dryRun) {
      await checked(db.from("video_projects").update({ status: "failed", generation_error: message }).eq("id", project.id));
      await event(project.id, "failed", message, 0);
    }
    throw error;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function main() {
  if (!dryRun) await execFileAsync("ffmpeg", ["-version"]);
  console.log("Video worker: routing by each project’s saved provider (Higgsfield API / Kling / legacy Higgsfield CLI)");
  let keepRunning = true;
  while (keepRunning) {
    const project = await claimNextProject();
    if (project) {
      console.log(`Processing video project ${project.id}${dryRun ? " (dry run)" : ""}`);
      try { await processProject(project); } catch (error) { console.error(error); if (once || dryRun || resumeProjectId) process.exitCode = 1; }
    } else if (!once) {
      await sleep(pollMs);
    }
    if (once || dryRun || resumeProjectId) keepRunning = false;
  }
}

await main();
