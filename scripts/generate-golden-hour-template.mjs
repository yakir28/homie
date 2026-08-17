import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const execFileAsync = promisify(execFile);
const runwaySecret = process.env.RUNWAYML_API_SECRET;
const runwayBase = process.env.RUNWAY_API_BASE_URL ?? "https://api.dev.runwayml.com";
const runwayVersion = process.env.RUNWAY_API_VERSION ?? "2024-11-06";
const model = process.env.RUNWAY_VIDEO_MODEL ?? "gen4_turbo";
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.R2_BUCKET_NAME ?? "homie";
const outputDirectory = join(process.cwd(), "artifacts", "golden-hour-estate");
const publishOnly = process.argv.includes("--publish-only");

if (!runwaySecret || !supabaseUrl || !serviceKey) throw new Error("Runway and Supabase worker credentials are required.");
if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error("R2 credentials are required to publish the Explore template.");
}

const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  maxAttempts: 4,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

const shots = [
  {
    source: "/Users/yakir/Movies/CapCut/צילום מסך 2026-08-07 ב-23.58.45.png",
    role: "aerial-arrival",
    prompt: "Premium golden-hour real-estate film. A very slow stabilized aerial push toward the exact featured white estate and hillside neighborhood. Preserve every building, roof, road, tree and terrain feature exactly. Natural realistic parallax only. No people, text, logos, new buildings or changed architecture.",
  },
  {
    source: "/Users/yakir/Movies/CapCut/צילום מסך 2026-08-07 ב-23.58.53.png",
    role: "pool-hero",
    prompt: "Premium golden-hour real-estate film. Slow symmetrical dolly toward the exact rear facade across the pool. Preserve the house, roofline, windows, patio, outdoor kitchen, loungers and reflection exactly. Only gentle realistic water ripples and subtle foliage movement. No people, text, logos or structural changes.",
  },
  {
    source: "/Users/yakir/Movies/CapCut/צילום מסך 2026-08-07 ב-23.59.58.png",
    role: "living-room",
    prompt: "Premium golden-hour real-estate film. A subtle controlled push through the exact living room toward the fireplace wall. Preserve every sofa, chair, table, television, fireplace, window, plant and architectural line. Warm natural sunlight, stable level camera. No people, text, logos or invented decor.",
  },
  {
    source: "/Users/yakir/Movies/CapCut/צילום מסך 2026-08-07 ב-23.59.45.png",
    role: "stair-detail",
    prompt: "Premium architectural real-estate film. Elegant very slow upward camera drift following the exact curved staircase and sculptural chandelier. Preserve the railing geometry, steps, walls, chandelier and furnishings exactly. Stable level optics. No people, text, logos, warped railings or changed architecture.",
  },
  {
    source: "/Users/yakir/Movies/CapCut/צילום מסך 2026-08-07 ב-23.59.31.png",
    role: "terrace-finale",
    prompt: "Premium blue-hour real-estate film. Slow cinematic lateral drift across the exact terrace, fire feature, railing, pool and distant landscape. Preserve all architecture and scenery exactly. Animate only the existing flame, faint pool ripples and subtle foliage. End on a calm luxury hero frame. No people, text, logos or new objects.",
  },
];

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function runway(path, init = {}) {
  const response = await fetch(`${runwayBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${runwaySecret}`,
      "X-Runway-Version": runwayVersion,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Runway ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function prepareImage(shot, index) {
  const output = join(outputDirectory, `${index + 1}-${shot.role}.jpg`);
  // Remove browser/listing overlays at the top and bottom while retaining the original composition.
  await execFileAsync("ffmpeg", ["-y", "-i", shot.source, "-vf", "crop=iw:ih-180:0:90,scale='min(1600,iw)':-2", "-q:v", "2", output]);
  return output;
}

async function generate(shot, imagePath, index) {
  const promptImage = `data:image/jpeg;base64,${(await readFile(imagePath)).toString("base64")}`;
  const created = await runway("/v1/image_to_video", {
    method: "POST",
    body: JSON.stringify({ model, promptImage, promptText: shot.prompt, ratio: "720:1280", duration: 5 }),
  });
  console.log(`Shot ${index + 1}/5 submitted: ${created.id}`);
  for (;;) {
    await sleep(5000);
    const task = await runway(`/v1/tasks/${encodeURIComponent(created.id)}`);
    const status = String(task.status).toUpperCase();
    if (status === "SUCCEEDED") {
      const url = Array.isArray(task.output) ? task.output[0] : task.output;
      if (!url) throw new Error(`Task ${created.id} succeeded without output.`);
      const clip = join(outputDirectory, `${index + 1}-${shot.role}.mp4`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not download shot ${index + 1}: ${response.status}`);
      await writeFile(clip, Buffer.from(await response.arrayBuffer()));
      await writeFile(join(outputDirectory, `${index + 1}-${shot.role}.json`), JSON.stringify(task, null, 2));
      console.log(`Shot ${index + 1}/5 ready`);
      return clip;
    }
    if (["FAILED", "CANCELED"].includes(status)) throw new Error(`Shot ${index + 1} ${status}: ${task.failure ?? task.failureCode ?? "unknown"}`);
  }
}

async function assemble(clips, output) {
  const list = join(outputDirectory, "clips.txt");
  await writeFile(list, clips.map((clip) => `file '${clip.replaceAll("'", "'\\''")}'`).join("\n"));
  await new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c:v", "libx264", "-c:a", "aac", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)));
  });
}

async function upload(key, path, contentType) {
  await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: await readFile(path), ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
}

await mkdir(outputDirectory, { recursive: true });
const preview = join(outputDirectory, "preview.mp4");
const thumbnail = join(outputDirectory, "thumbnail.jpg");
if (!publishOnly) {
  const clips = [];
  for (let index = 0; index < shots.length; index += 1) {
    const image = await prepareImage(shots[index], index);
    clips.push(await generate(shots[index], image, index));
  }
  await assemble(clips, preview);
  await execFileAsync("ffmpeg", ["-y", "-ss", "5.5", "-i", preview, "-frames:v", "1", "-q:v", "2", thumbnail]);
}
await upload("templates/golden-hour-estate/preview.mp4", preview, "video/mp4");
await upload("templates/golden-hour-estate/thumbnail.jpg", thumbnail, "image/jpeg");

const { error } = await db.from("video_templates").update({ is_active: true, is_featured: true }).eq("slug", "golden-hour-estate");
if (error) throw error;
console.log(`Published Golden Hour Estate to Explore: ${preview}`);
