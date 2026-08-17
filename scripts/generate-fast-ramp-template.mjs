import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const secret = process.env.RUNWAYML_API_SECRET;
const base = process.env.RUNWAY_API_BASE_URL ?? "https://api.dev.runwayml.com";
const version = process.env.RUNWAY_API_VERSION ?? "2024-11-06";
const outputDirectory = join(process.cwd(), "artifacts", "fast-ramp-house-3");
if (!secret) throw new Error("RUNWAYML_API_SECRET is required.");

const shots = [
  {
    name: "entrance",
    source: "/Users/yakir/Downloads/house 3/צילום מסך 2026-08-08 ב-2.24.35.png",
    prompt: "Photorealistic real-estate film. Smooth stabilized forward push along the exact garden path toward the real white front door, with clean natural parallax from the foreground agave. Preserve the exact facade, door, windows, hedges, plants, path and balcony. Straight architecture, stable geometry, consistent fine detail. No people, text, logos, invented objects, morphing, warped plants, changing openings or camera shake.",
  },
  {
    name: "living",
    source: "/Users/yakir/Downloads/house 3/צילום מסך 2026-08-08 ב-2.24.16.png",
    prompt: "Photorealistic real-estate film. Smooth stabilized lateral slide from left to right across the exact double-height living room, gently revealing the staircase, sofa and upper railing. Preserve every wall, stair, railing, window, sofa, chair, table, shelf, lamp and artwork exactly. Straight verticals, rigid furniture, stable geometry. No people, text, logos, added decor, morphing, texture shimmer or camera shake.",
  },
  {
    name: "dining-kitchen",
    source: "/Users/yakir/Downloads/house 3/צילום מסך 2026-08-08 ב-2.25.10.png",
    prompt: "Photorealistic real-estate film. Smooth stabilized push past the exact dining table toward the kitchen, with restrained natural parallax between the chairs, flowers and cabinetry. Preserve the exact table, chairs, flowers, cabinets, appliances, counters, railings and room geometry. Straight lines and consistent fine detail. No people, text, logos, invented objects, warped chairs, morphing or camera shake.",
  },
  {
    name: "patio-finale",
    source: "/Users/yakir/Downloads/house 3/צילום מסך 2026-08-08 ב-2.24.28.png",
    prompt: "Photorealistic real-estate film. Smooth stabilized pullback from the open sliding door across the exact private patio, ending on a clean wide hero composition. Preserve the exact doorway, arched window, umbrella, chairs, cushions, tables, plants, walls and view into the living room. Only subtle foliage movement. No people, text, logos, invented furniture, morphing, warped geometry or camera shake.",
  },
];

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function runway(path, init = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "X-Runway-Version": version, ...(init.body ? { "Content-Type": "application/json" } : {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Runway ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function prepare(source, destination) {
  // Center crop removes listing navigation controls and establishes the final vertical framing before generation.
  await execFileAsync("ffmpeg", ["-y", "-i", source, "-vf", "crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=720:1280:flags=lanczos", "-q:v", "2", destination]);
}

async function generate(shot, imagePath, index) {
  const promptImage = `data:image/jpeg;base64,${(await readFile(imagePath)).toString("base64")}`;
  const task = await runway("/v1/image_to_video", {
    method: "POST",
    body: JSON.stringify({ model: "gen4.5", promptImage, promptText: shot.prompt, ratio: "720:1280", duration: 5 }),
  });
  console.log(`Shot ${index + 1}/${shots.length} submitted: ${task.id}`);
  for (;;) {
    await sleep(5000);
    const current = await runway(`/v1/tasks/${encodeURIComponent(task.id)}`);
    const status = String(current.status).toUpperCase();
    if (status === "SUCCEEDED") {
      const url = Array.isArray(current.output) ? current.output[0] : current.output;
      if (!url) throw new Error(`Task ${task.id} completed without output.`);
      const output = join(outputDirectory, `${index + 1}-${shot.name}.mp4`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed (${response.status}).`);
      await writeFile(output, Buffer.from(await response.arrayBuffer()));
      await writeFile(join(outputDirectory, `${index + 1}-${shot.name}.json`), JSON.stringify(current, null, 2));
      console.log(`Shot ${index + 1}/${shots.length} ready`);
      return output;
    }
    if (["FAILED", "CANCELED"].includes(status)) throw new Error(`Shot ${index + 1} ${status}: ${current.failure ?? current.failureCode ?? "unknown"}`);
  }
}

async function speedRamp(input, output) {
  // Ease in for 0.8s, accelerate the middle at 2.4x, then settle for the final 0.7s.
  const filter = "[0:v]trim=0:0.8,setpts=PTS-STARTPTS[v0];[0:v]trim=0.8:4.3,setpts=(PTS-STARTPTS)/2.4[v1];[0:v]trim=4.3:5,setpts=PTS-STARTPTS[v2];[v0][v1][v2]concat=n=3:v=1:a=0,fps=30,format=yuv420p[v]";
  await execFileAsync("ffmpeg", ["-y", "-i", input, "-filter_complex", filter, "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "8M", "-bufsize", "16M", output]);
}

async function assemble(clips, output) {
  const list = join(outputDirectory, "ramped-clips.txt");
  await writeFile(list, clips.map((clip) => `file '${clip.replaceAll("'", "'\\''")}'`).join("\n"));
  await new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)));
  });
}

await mkdir(outputDirectory, { recursive: true });
const ramped = [];
for (let index = 0; index < shots.length; index += 1) {
  const image = join(outputDirectory, `${index + 1}-${shots[index].name}.jpg`);
  await prepare(shots[index].source, image);
  const generated = await generate(shots[index], image, index);
  const edited = join(outputDirectory, `${index + 1}-${shots[index].name}-ramp.mp4`);
  await speedRamp(generated, edited);
  ramped.push(edited);
}
await assemble(ramped, join(outputDirectory, "fast-ramp-preview.mp4"));
await execFileAsync("ffmpeg", ["-y", "-ss", "3.2", "-i", join(outputDirectory, "fast-ramp-preview.mp4"), "-frames:v", "1", "-q:v", "2", join(outputDirectory, "thumbnail.jpg")]);
console.log(`Fast Ramp preview ready: ${join(outputDirectory, "fast-ramp-preview.mp4")}`);
