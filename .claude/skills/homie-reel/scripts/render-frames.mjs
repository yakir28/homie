// Render an HTML timeline to a PNG frame sequence by seeking paused CSS animations.
// Every frame must be a pure function of time. Transparent background unless the page paints one.
// Usage: NODE_PATH=/opt/node-tools/node_modules node render-frames.mjs <timeline.html> <seconds> <outDir> [fps=30]
import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
const { chromium } = createRequire(import.meta.url)("playwright");

const [, , html, seconds, outDir, fpsArg] = process.argv;
if (!html || !seconds || !outDir) {
  console.error("usage: render-frames.mjs <timeline.html> <seconds> <outDir> [fps]");
  process.exit(1);
}
const fps = Number(fpsArg || 30);
const out = resolve(outDir);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto("file://" + resolve(html), { waitUntil: "networkidle" });
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))));
  document.getAnimations().forEach((a) => a.pause());
});
const n = Math.round(Number(seconds) * fps);
for (let i = 0; i < n; i++) {
  await page.evaluate((t) => document.getAnimations().forEach((a) => (a.currentTime = t)), (i * 1000) / fps);
  await page.screenshot({ path: `${out}/${String(i).padStart(5, "0")}.png`, omitBackground: true });
}
await browser.close();
console.log(`${n} frames -> ${out}`);
