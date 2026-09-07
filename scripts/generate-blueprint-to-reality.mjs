import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = resolve(projectRoot, "blueprint-to-reality");
const model = "seedance_2_5";
const promptSource = await readFile(resolve(assetRoot, "template.md"), "utf8");
const promptMatch = promptSource.match(/## Seedance prompt\n\n([\s\S]*?)\n\n## Post-generation copy/);

if (!promptMatch) {
  throw new Error("Could not extract the Seedance prompt from template.md.");
}

const references = [
  "01-empty-blueprint.png",
  "02-blueprint-elevation.png",
  "03-blueprint-axonometric.png",
  "04-line-to-matter.png",
  "05-real-house-exterior.png",
  "06-blueprint-floor-plan.png",
  "07-living-room.png",
  "08-kitchen-dining.png",
  "09-backyard.png",
  "10-proof-overlay.png",
].map((name) => resolve(assetRoot, "ordered-references", name));

await Promise.all(references.map((path) => access(path)));

const prompt = `${promptMatch[1]}

REFERENCE ORDER LOCK: The ten supplied references are, in order: empty blueprint paper; matching blueprint elevation; matching blueprint axonometric; matching line-to-matter state; exact real front exterior; matching ground-floor blueprint plan; exact living room; exact kitchen and dining area; exact backyard; exact front proof-overlay composition. Use every supplied reference exactly once as a chronological visual anchor.`;

const command = [
  "generate", "create", model,
  "--prompt", prompt,
];

for (const reference of references) {
  command.push("--image", reference);
}

command.push(
  "--duration", "30",
  "--resolution", "1080p",
  "--aspect_ratio", "3:4",
  "--mode", "omni_reference",
  "--bitrate_mode", "high",
  "--generate_audio", "false",
  "--wait",
  "--wait-timeout", "40m",
  "--wait-interval", "5s",
  "--json",
);

const child = spawn("higgsfield", command, {
  cwd: projectRoot,
  stdio: ["ignore", "pipe", "inherit"],
});

let stdout = "";
child.stdout.on("data", (chunk) => {
  stdout += chunk;
});

const exitCode = await new Promise((resolveExit, reject) => {
  child.once("error", reject);
  child.once("exit", resolveExit);
});

if (exitCode !== 0) {
  throw new Error(`Higgsfield exited with code ${exitCode}.`);
}

const payload = JSON.parse(stdout);
const job = Array.isArray(payload) ? payload[0] : Array.isArray(payload?.jobs) ? payload.jobs[0] : payload;
const videoUrl = job?.result?.url
  ?? job?.result?.video_url
  ?? job?.result_url
  ?? job?.min_result_url
  ?? job?.output_url
  ?? job?.url;

if (!videoUrl) {
  throw new Error("Seedance completed without a video URL.");
}

const response = await fetch(videoUrl);
if (!response.ok) {
  throw new Error(`Could not download generated video (${response.status}).`);
}

const outputPath = resolve(assetRoot, "blueprint-to-reality-seedance-2-5-30s-3x4-1080p.mp4");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));

console.log(`VIDEO_URL=${videoUrl}`);
console.log(`OUTPUT_PATH=${outputPath}`);
