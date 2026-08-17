import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const secret = process.env.RUNWAYML_API_SECRET;
const apiBase = process.env.RUNWAY_API_BASE_URL ?? "https://api.dev.runwayml.com";
const apiVersion = process.env.RUNWAY_API_VERSION ?? "2024-11-06";
const outputDirectory = join(process.cwd(), "artifacts", "bright-flow-house-5");
if (!secret) throw new Error("RUNWAYML_API_SECRET is required.");

const shots = [
  {
    name: "exterior-arrival",
    source: "/Users/yakir/Downloads/house 5/2b5d330b956002a7d2ddd2c28f270be4l-m1116338071rd-w1280_h960.webp",
    prompt: "The camera moves forward slowly and smoothly toward the exact white front facade, creating a premium real-estate arrival. Motion is stabilized, realistic, and grounded at human height. Preserve the exact roofline, garage doors, windows, driveway, palms, landscaping, neighboring walls, colors, proportions, and bright daylight. No people, cars, text, logos, new plants, changing openings, warped architecture, morphing, flicker, or camera shake.",
    focusX: 0.50,
  },
  {
    name: "foyer-staircase",
    source: "/Users/yakir/Downloads/house 5/2b5d330b956002a7d2ddd2c28f270be4l-m2624091123rd-w1280_h960.webp",
    prompt: "The camera glides gently forward and slightly upward through the exact double-height living space, revealing the curved upper railing and staircase in one smooth continuous move. Keep the exact stairs, dark railings, fireplace, windows, shutters, tiled floor, walls, doorways, and ceiling fixed and aligned. Premium stabilized listing cinematography. No furniture, people, text, logos, invented rooms, changing railings, warped stairs, geometry drift, or flicker.",
    focusX: 0.64,
  },
  {
    name: "kitchen-reveal",
    source: "/Users/yakir/Downloads/house 5/2b5d330b956002a7d2ddd2c28f270be4l-m2843744826rd-w1280_h960.webp",
    prompt: "The camera gently turns right and moves forward toward the exact kitchen in a smooth luxury listing reveal. Preserve the exact island, wood cabinets, stainless appliances, counters, sliding door, patio column, windows, flooring, ceiling lights, proportions, and daylight. Natural stabilized motion with restrained parallax. No people, text, logos, added decor, changing cabinets, warped appliances, morphing, flicker, or camera shake.",
    focusX: 0.62,
  },
  {
    name: "garden-finale",
    source: "/Users/yakir/Downloads/house 5/2b5d330b956002a7d2ddd2c28f270be4l-m3198226398rd-w1280_h960.webp",
    prompt: "The camera moves smoothly from the exact fireplace toward the open sliding door and settles on the bright private patio and garden, creating a calm final reveal. Preserve the exact fireplace, windows, shutters, door frame, patio paving, railing, plants, wood floor, white walls, proportions, and clean daylight. Subtle natural foliage motion only. No people, text, logos, invented furniture, changing openings, warped geometry, morphing, or flicker.",
    focusX: 0.55,
  },
];

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function runway(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "X-Runway-Version": apiVersion, ...(init.body ? { "Content-Type": "application/json" } : {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Runway ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function prepare(shot, destination) {
  // Crop away the listing watermark while selecting a deliberate vertical focal region before generation.
  const xExpression = `(iw-ih*9/16)*${shot.focusX}`;
  await execFileAsync("ffmpeg", ["-y", "-i", shot.source, "-vf", `crop=ih*9/16:ih:${xExpression}:0,scale=720:1280:flags=lanczos`, "-q:v", "2", destination]);
}

async function generate(shot, imagePath, index) {
  const promptImage = `data:image/jpeg;base64,${(await readFile(imagePath)).toString("base64")}`;
  const created = await runway("/v1/image_to_video", {
    method: "POST",
    body: JSON.stringify({ model: "gen4.5", promptImage, promptText: shot.prompt, ratio: "720:1280", duration: 5 }),
  });
  console.log(`Shot ${index + 1}/${shots.length} submitted: ${created.id}`);
  for (;;) {
    await sleep(5000);
    const task = await runway(`/v1/tasks/${encodeURIComponent(created.id)}`);
    const status = String(task.status).toUpperCase();
    if (status === "SUCCEEDED") {
      const url = Array.isArray(task.output) ? task.output[0] : task.output;
      if (!url) throw new Error(`Task ${created.id} completed without output.`);
      const output = join(outputDirectory, `${index + 1}-${shot.name}.mp4`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed (${response.status}).`);
      await writeFile(output, Buffer.from(await response.arrayBuffer()));
      await writeFile(join(outputDirectory, `${index + 1}-${shot.name}.json`), JSON.stringify(task, null, 2));
      console.log(`Shot ${index + 1}/${shots.length} ready`);
      return output;
    }
    if (["FAILED", "CANCELED"].includes(status)) throw new Error(`Shot ${index + 1} ${status}: ${task.failure ?? task.failureCode ?? "unknown"}`);
  }
}

async function trim(input, output) {
  await execFileAsync("ffmpeg", ["-y", "-i", input, "-t", "4.5", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p", output]);
}

async function assemble(clips, output) {
  const list = join(outputDirectory, "clips.txt");
  await writeFile(list, clips.map((clip) => `file '${clip.replaceAll("'", "'\\''")}'`).join("\n"));
  await new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", list, "-t", "18", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)));
  });
}

await mkdir(outputDirectory, { recursive: true });
const edited = [];
for (let index = 0; index < shots.length; index += 1) {
  const image = join(outputDirectory, `${index + 1}-${shots[index].name}.jpg`);
  await prepare(shots[index], image);
  const generated = await generate(shots[index], image, index);
  const trimmed = join(outputDirectory, `${index + 1}-${shots[index].name}-edited.mp4`);
  await trim(generated, trimmed);
  edited.push(trimmed);
}

const preview = join(outputDirectory, "bright-flow-preview.mp4");
await assemble(edited, preview);
await execFileAsync("ffmpeg", ["-y", "-ss", "1.5", "-i", preview, "-frames:v", "1", "-q:v", "2", join(outputDirectory, "thumbnail.jpg")]);
console.log(`Bright Flow preview ready: ${preview}`);
