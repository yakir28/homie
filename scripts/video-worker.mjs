import { execFile, spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const execFileAsync = promisify(execFile);
const args = new Set(process.argv.slice(2));
const once = args.has("--once");
const dryRun = args.has("--dry-run");
const pollMs = Number(process.env.VIDEO_WORKER_POLL_MS ?? 5000);
const videoProvider = (process.env.VIDEO_PROVIDER ?? "runway").toLowerCase();
const higgsfieldModel = process.env.HIGGSFIELD_VIDEO_MODEL ?? "seedance_2_0";
const higgsfieldResolution = process.env.HIGGSFIELD_VIDEO_RESOLUTION ?? "720p";
const higgsfieldWaitTimeout = process.env.HIGGSFIELD_WAIT_TIMEOUT ?? "30m";
const runwayApiSecret = process.env.RUNWAYML_API_SECRET;
const runwayModel = process.env.RUNWAY_VIDEO_MODEL ?? "gen4_turbo";
const runwayApiBase = process.env.RUNWAY_API_BASE_URL ?? "https://api.dev.runwayml.com";
const runwayApiVersion = process.env.RUNWAY_API_VERSION ?? "2024-11-06";
const runwayPollMs = Number(process.env.RUNWAY_POLL_MS ?? 5000);
const runwayWaitTimeoutMs = Number(process.env.RUNWAY_WAIT_TIMEOUT_MS ?? 1_800_000);
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME ?? "homie";
const hasR2Credentials = Boolean(r2AccountId && r2AccessKeyId && r2SecretAccessKey);

if (!["runway", "higgsfield"].includes(videoProvider)) {
  throw new Error(`Unsupported VIDEO_PROVIDER "${videoProvider}". Use "runway" or "higgsfield".`);
}
if (!dryRun && videoProvider === "runway" && !runwayApiSecret) {
  throw new Error("Set RUNWAYML_API_SECRET when VIDEO_PROVIDER=runway.");
}

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

const BASE_PROMPT = "Polished cinematic real-estate walkthrough. Smooth controlled camera movement, stable level horizon, realistic architectural geometry, consistent furniture and openings, natural spatial continuity, balanced light, tack-sharp luxury-listing cinematography.";
const PRESERVATION_PROMPT = "Treat every supplied property image as ground truth. Preserve the exact architecture, room proportions, doors, windows, furniture, materials, landscaping, and lighting. Do not invent rooms, openings, floors, decor, text, people, or structural transitions that are not visible in the references.";
const MOTIONS = [
  "Begin with a slow, stable push forward and ease to a stop on the architectural focal point.",
  "Glide gently through the space, preserving the exact room geometry and furniture layout.",
  "Make a restrained cinematic reveal with one smooth camera move and a level horizon.",
  "Drift forward slowly toward the strongest feature, ending on a clean hero composition.",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runwayDuration(duration) {
  // Gen-4 video generations are currently offered in 5- or 10-second clips.
  return duration <= 5 ? 5 : 10;
}

function runwayRatio(aspectRatio) {
  const normalized = String(aspectRatio).replace("/", ":");
  if (normalized === "9:16") return "720:1280";
  if (normalized === "1:1") return "960:960";
  return "1280:720";
}

async function imageDataUri(path) {
  const bytes = await readFile(path);
  const mime = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    ? "image/png"
    : bytes[0] === 0xff && bytes[1] === 0xd8
      ? "image/jpeg"
      : "application/octet-stream";
  if (mime === "application/octet-stream") throw new Error(`Unsupported reference image format: ${path}`);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

async function runwayRequest(path, init = {}) {
  const response = await fetch(`${runwayApiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${runwayApiSecret}`,
      "X-Runway-Version": runwayApiVersion,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const apiDetail = payload?.error ?? payload?.message ?? payload;
    const detail = typeof apiDetail === "string" ? apiDetail : JSON.stringify(apiDetail);
    throw new Error(`Runway API ${response.status}: ${detail}`);
  }
  return payload;
}

async function event(projectId, stage, message, progress, metadata = {}) {
  await db.from("generation_events").insert({
    video_project_id: projectId,
    stage,
    message,
    progress,
    metadata,
  });
  await db.from("video_projects").update({ generation_progress: progress }).eq("id", projectId);
}

async function claimNextProject() {
  const { data: queued, error } = await db
    .from("video_projects")
    .select("id, workspace_id, duration_seconds, output_format, template_prompt_snapshot, video_templates(generation_config), video_project_photos(sort_order, listing_photos(id, storage_path, source_url, room_type, metadata))")
    .eq("status", "queued")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!queued) return null;

  const { data: claimed, error: claimError } = await db
    .from("video_projects")
    .update({ status: "generating", generation_progress: 1, generation_error: null })
    .eq("id", queued.id)
    .eq("status", "queued")
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

function inferredRole(index, total) {
  if (index === 0) return "exterior arrival or strongest opening view";
  if (index === total - 1) return "hero closing view";
  if (index / total < 0.55) return "main interior living space";
  return "feature room or lifestyle detail";
}

function makeShotPlan(project, photos) {
  const config = project.template_prompt_snapshot ?? project.video_templates?.generation_config ?? {};
  const configured = Array.isArray(config.shots) ? config.shots : [];
  const templateProvider = String(config.provider ?? videoProvider).toLowerCase();
  if (!["runway", "higgsfield"].includes(templateProvider)) {
    throw new Error(`Unsupported template video provider "${templateProvider}".`);
  }
  const desiredShotCount = templateProvider === "runway"
    ? Math.ceil(project.duration_seconds / 5)
    : Math.round(project.duration_seconds / 6);
  const targetShots = Math.max(1, Math.min(photos.length, configured.length || desiredShotCount));
  const duration = templateProvider === "runway"
    ? runwayDuration(project.duration_seconds / targetShots)
    : Math.max(4, Math.min(15, Math.round(project.duration_seconds / targetShots)));
  const configuredTotal = configured.slice(0, targetShots).reduce((sum, shot) => sum + (Number(shot.duration) || 0), 0);
  const runwayTemplateTimingIsValid = configured
    .slice(0, targetShots)
    .every((shot) => [5, 10].includes(Number(shot.duration)));
  const usesExactTemplateTiming = configuredTotal === project.duration_seconds
    && (templateProvider !== "runway" || runwayTemplateTimingIsValid);
  return Array.from({ length: targetShots }, (_, index) => {
    const definition = configured[index] ?? {};
    const shotSpan = Math.max(1, targetShots - 1);
    const startIndex = Math.min(photos.length - 1, Math.round(index * (photos.length - 1) / shotSpan));
    const endIndex = Math.min(photos.length - 1, Math.round((index + 1) * (photos.length - 1) / shotSpan));
    const midpoint = Math.min(photos.length - 1, Math.round((startIndex + endIndex) / 2));
    const startLabel = photos[startIndex].roomType ?? inferredRole(startIndex, photos.length);
    const endLabel = photos[endIndex].roomType ?? inferredRole(endIndex, photos.length);
    const basePrompt = config.base_prompt ?? BASE_PROMPT;
    const preservationPrompt = config.preservation_prompt ?? PRESERVATION_PROMPT;
    const imageAdaptation = definition.reference_mode === "end"
      ? `The end reference is the ground-truth property reveal. Begin with the described stylized setup, then converge cleanly and exactly on that reference without changing the home's architecture, materials, or surroundings.`
      : definition.reference_mode === "start"
        ? `The start reference is the immutable ground-truth property. Keep that exact property identity, architecture, materials, landscaping, and surroundings throughout the entire shot.`
      : `The start reference shows ${startLabel}; the end reference shows ${endLabel}. Adapt the camera path to only what is visually supported by these images. If they do not show a physically connected space, use a graceful editorial reveal rather than inventing a doorway or passage.`;
    return {
      order: index,
      role: definition.role ?? (index === 0 ? "hook" : index === targetShots - 1 ? "closing" : "interior"),
      duration: usesExactTemplateTiming ? Number(definition.duration) : duration,
      prompt: `${basePrompt} ${preservationPrompt} ${definition.prompt ?? definition.motion ?? MOTIONS[index % MOTIONS.length]} ${imageAdaptation}`,
      startPath: definition.reference_mode === "end" ? null : photos[startIndex].path,
      endPath: definition.reference_mode === "end"
        ? photos[startIndex].path
        : definition.reference_mode === "start"
          ? null
          : endIndex !== startIndex ? photos[endIndex].path : null,
      referencePaths: ["start", "end"].includes(definition.reference_mode)
        ? []
        : midpoint !== startIndex && midpoint !== endIndex ? [photos[midpoint].path] : [],
      provider: templateProvider,
      model: templateProvider === "runway"
        ? config.runway_model ?? runwayModel
        : config.higgsfield_model ?? config.model ?? higgsfieldModel,
      resolution: templateProvider === "runway"
        ? config.runway_resolution ?? "720p"
        : config.higgsfield_resolution ?? config.resolution ?? higgsfieldResolution,
      generateAudio: config.supports_generate_audio === false
        ? null
        : definition.generate_audio ?? config.generate_audio ?? false,
    };
  });
}

async function runHiggsfield(shot, aspectRatio) {
  const command = [
    "generate", "create", shot.model,
    "--prompt", shot.prompt,
  ];
  if (shot.startPath) command.push("--start-image", shot.startPath);
  if (shot.endPath) command.push("--end-image", shot.endPath);
  for (const referencePath of shot.referencePaths) command.push("--image", referencePath);
  command.push(
    "--duration", String(shot.duration),
    "--resolution", shot.resolution,
    "--aspect_ratio", aspectRatio,
    "--wait",
    "--wait-timeout", higgsfieldWaitTimeout,
    "--wait-interval", "5s",
    "--json",
  );
  if (shot.generateAudio !== null) {
    command.splice(command.indexOf("--wait"), 0, "--generate_audio", String(shot.generateAudio));
  }
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

async function runRunway(shot, aspectRatio) {
  const imagePath = shot.startPath ?? shot.endPath;
  if (!imagePath) throw new Error("Runway image-to-video requires a shot reference image.");
  const task = await runwayRequest("/v1/image_to_video", {
    method: "POST",
    body: JSON.stringify({
      model: shot.model,
      promptImage: await imageDataUri(imagePath),
      promptText: `${shot.prompt} Use restrained micro-motion only. Maintain straight verticals, stable walls, rigid railings, fixed furniture, and consistent fine detail in every frame. No morphing, warping, zoom pulses, texture shimmer, or geometry drift.`.slice(0, 1000),
      ratio: runwayRatio(aspectRatio),
      duration: runwayDuration(shot.duration),
    }),
  });
  if (!task?.id) throw new Error("Runway accepted the request without returning a task ID.");

  const deadline = Date.now() + runwayWaitTimeoutMs;
  while (Date.now() < deadline) {
    const current = await runwayRequest(`/v1/tasks/${encodeURIComponent(task.id)}`);
    const status = String(current.status ?? "").toUpperCase();
    if (status === "SUCCEEDED") {
      const outputUrl = Array.isArray(current.output) ? current.output[0] : current.output;
      if (!outputUrl) throw new Error("Runway completed without a video URL.");
      return { outputUrl, jobId: task.id, raw: current };
    }
    if (["FAILED", "CANCELED"].includes(status)) {
      throw new Error(`Runway task ${status.toLowerCase()}: ${current.failure ?? current.failureCode ?? "unknown error"}`);
    }
    await sleep(runwayPollMs);
  }
  throw new Error(`Runway task ${task.id} timed out after ${Math.round(runwayWaitTimeoutMs / 60000)} minutes.`);
}

async function generateShot(shot, aspectRatio) {
  return shot.provider === "runway"
    ? runRunway(shot, aspectRatio)
    : runHiggsfield(shot, aspectRatio);
}

async function download(url, path) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download generated clip (${response.status}).`);
  await writeFile(path, Buffer.from(await response.arrayBuffer()));
}

async function assemble(clips, outputPath, duration) {
  const listPath = `${outputPath}.txt`;
  await writeFile(listPath, clips.map((clip) => `file '${clip.replaceAll("'", "'\\''")}'`).join("\n"));
  await new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-t", String(duration), "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "8M", "-bufsize", "16M", "-c:a", "aac", "-b:a", "192k", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outputPath], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}.`)));
  });
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
    if (photoRows.length < 2) throw new Error("At least two project photos are required.");
    await event(project.id, "planning", "Planning the property route", 5);
    const photos = [];
    for (let index = 0; index < photoRows.length; index += 1) {
      photos.push(await materializePhoto(photoRows[index].listing_photos, directory, index));
    }
    const shots = makeShotPlan(project, photos);
    if (dryRun) {
      await event(project.id, "dry_run", `Validated a ${shots.length}-shot plan`, 10, { provider: shots[0]?.provider, model: shots[0]?.model, resolution: shots[0]?.resolution });
      await db.from("video_projects").update({ status: "queued", generation_progress: 0 }).eq("id", project.id);
      return;
    }

    const clipPaths = [];
    const outputs = [];
    for (const shot of shots) {
      const startProgress = 10 + Math.round((shot.order / shots.length) * 65);
      await event(project.id, "generating", `Generating shot ${shot.order + 1} of ${shots.length}`, startProgress, { role: shot.role });
      await db.from("video_project_shots").upsert({
        video_project_id: project.id,
        shot_order: shot.order,
        role: shot.role,
        duration_seconds: shot.duration,
        prompt: shot.prompt,
        model: shot.model,
        status: "generating",
        error_message: null,
      }, { onConflict: "video_project_id,shot_order" });
      let result;
      try {
        result = await generateShot(shot, project.output_format);
      } catch (error) {
        await db.from("video_project_shots").update({
          status: "failed",
          error_message: error instanceof Error ? error.message : String(error),
        }).eq("video_project_id", project.id).eq("shot_order", shot.order);
        throw error;
      }
      outputs.push(result.outputUrl);
      await db.from("video_project_shots").upsert({
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
      }, { onConflict: "video_project_id,shot_order" });
      const clipPath = join(directory, `clip-${String(shot.order).padStart(2, "0")}.mp4`);
      await download(result.outputUrl, clipPath);
      clipPaths.push(clipPath);
    }

    await event(project.id, "editing", "Assembling and normalizing the final tour", 82);
    const finalPath = join(directory, `homie-${project.id}.mp4`);
    await assemble(clipPaths, finalPath, project.duration_seconds);
    const storagePath = `videos/${project.workspace_id}/${project.id}/version-1.mp4`;
    await event(project.id, "uploading", "Uploading the finished video to Cloudflare R2", 92);
    await uploadFinalVideo(project, finalPath, storagePath);

    await db.from("video_versions").upsert({
      video_project_id: project.id,
      version_number: 1,
      status: "ready",
      video_url: null,
      duration_seconds: project.duration_seconds,
      provider_metadata: { provider: shots[0]?.provider, storage_provider: "cloudflare-r2", bucket: r2Bucket, r2_key: storagePath, model: shots[0]?.model, shot_outputs: outputs, prompt_recipe: project.template_prompt_snapshot },
      completed_at: new Date().toISOString(),
    }, { onConflict: "video_project_id,version_number" });
    await event(project.id, "ready", "Video ready for review", 100);
    await db.from("video_projects").update({ status: "awaiting_approval", generation_progress: 100 }).eq("id", project.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.from("video_projects").update({ status: "failed", generation_error: message }).eq("id", project.id);
    await event(project.id, "failed", message, 0);
    throw error;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function main() {
  if (videoProvider === "higgsfield") await execFileAsync("higgsfield", ["account", "status"]);
  if (!dryRun) await execFileAsync("ffmpeg", ["-version"]);
  console.log(`Video provider: ${videoProvider}${videoProvider === "runway" ? ` (${runwayModel})` : ` (${higgsfieldModel})`}`);
  let keepRunning = true;
  while (keepRunning) {
    const project = await claimNextProject();
    if (project) {
      console.log(`Processing video project ${project.id}${dryRun ? " (dry run)" : ""}`);
      try { await processProject(project); } catch (error) { console.error(error); }
    } else if (!once) {
      await sleep(pollMs);
    }
    if (once) keepRunning = false;
  }
}

await main();
