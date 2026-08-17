import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const secret = process.env.RUNWAYML_API_SECRET;
const base = process.env.RUNWAY_API_BASE_URL ?? "https://api.dev.runwayml.com";
const version = process.env.RUNWAY_API_VERSION ?? "2024-11-06";
const model = "gen4.5";
const outputDirectory = join(process.cwd(), "artifacts", "construction-hook");
if (!secret) throw new Error("RUNWAYML_API_SECRET is required.");

const shots = [
  {
    name: "magical-construction",
    source: "/Users/yakir/Movies/CapCut/צילום מסך 2026-08-07 ב-23.58.45.png",
    prompt: "Photorealistic magical construction timelapse resolving into the exact featured white hillside house in the reference. Locked high three-quarter aerial camera. Keep the surrounding hills, roads, neighboring houses, trees and terrain unchanged. The featured property assembles precisely in place: subtle surveyed ground lines glow, foundation locks in, structural walls rise, floors align, the exact red-tile roofline completes, windows and doors appear in their exact positions, white exterior finishes wrap onto surfaces, then the real pool and landscaping settle into their supplied arrangement. Restrained golden light trails, fine particles, precise mechanical alignment, subtle completion pulse. The final house must match the reference exactly in footprint, facade, roofline, openings, proportions, colors, pool and surroundings. No workers, cranes, vehicles, text, logos, debris, demolition, generic replacement house, invented landscaping, warped walls, shifting windows, flicker, texture shimmer or unstable geometry.",
  },
  {
    name: "completed-arrival",
    source: "/Users/yakir/Movies/CapCut/צילום מסך 2026-08-07 ב-23.58.53.png",
    prompt: "Begin with the exact completed property in the supplied reference. Premium photorealistic real-estate film in clean warm daylight. Make a restrained stabilized descending push toward the center of the rear facade, ending on the real ground-level patio entrance for an editorial match cut into the foyer. Preserve the exact facade, red-tile roofline, windows, doors, balcony, patio, pool, furniture, landscaping and reflections. Maintain straight verticals, rigid architecture, stable horizon and consistent fine detail. Very subtle pool ripples and foliage movement only. No people, text, logos, invented doorway, changing openings, morphing, geometry drift, zoom pulses or texture shimmer.",
  },
];

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function runway(path, init = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "X-Runway-Version": version,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Runway ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function prepare(source, destination) {
  // Remove the listing UI overlays, then create a deliberate vertical composition.
  await execFileAsync("ffmpeg", [
    "-y", "-i", source,
    "-vf", "crop=ih*9/16:ih-180:(iw-ih*9/16)/2:90,scale=720:1280:flags=lanczos",
    "-q:v", "2", destination,
  ]);
}

async function generate(shot, imagePath, index) {
  const image = `data:image/jpeg;base64,${(await readFile(imagePath)).toString("base64")}`;
  const created = await runway("/v1/image_to_video", {
    method: "POST",
    body: JSON.stringify({ model, promptImage: image, promptText: shot.prompt.slice(0, 1000), ratio: "720:1280", duration: 5 }),
  });
  console.log(`Shot ${index + 1}/2 submitted: ${created.id}`);
  for (;;) {
    await sleep(5000);
    const task = await runway(`/v1/tasks/${encodeURIComponent(created.id)}`);
    const status = String(task.status).toUpperCase();
    if (status === "SUCCEEDED") {
      const url = Array.isArray(task.output) ? task.output[0] : task.output;
      if (!url) throw new Error(`Task ${created.id} succeeded without output.`);
      const clip = join(outputDirectory, `${index + 1}-${shot.name}.mp4`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed (${response.status}).`);
      await writeFile(clip, Buffer.from(await response.arrayBuffer()));
      await writeFile(join(outputDirectory, `${index + 1}-${shot.name}.json`), JSON.stringify(task, null, 2));
      console.log(`Shot ${index + 1}/2 ready`);
      return clip;
    }
    if (["FAILED", "CANCELED"].includes(status)) throw new Error(`Shot ${index + 1} ${status}: ${task.failure ?? task.failureCode ?? "unknown"}`);
  }
}

async function assemble(clips, output) {
  const list = join(outputDirectory, "clips.txt");
  await writeFile(list, clips.map((clip) => `file '${clip.replaceAll("'", "'\\''")}'`).join("\n"));
  await new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)));
  });
}

await mkdir(outputDirectory, { recursive: true });
const clips = [];
for (let index = 0; index < shots.length; index += 1) {
  const prepared = join(outputDirectory, `${index + 1}-${shots[index].name}.jpg`);
  await prepare(shots[index].source, prepared);
  clips.push(await generate(shots[index], prepared, index));
}
await assemble(clips, join(outputDirectory, "construction-hook.mp4"));
console.log(`Construction hook ready: ${join(outputDirectory, "construction-hook.mp4")}`);
