import { createRequire } from "node:module";
import { resolve } from "node:path";
const { chromium } = createRequire(import.meta.url)("playwright");
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (const [html, png] of [["slide-cover.html", "01-cover.png"], ["slide-photos.html", "02-photos.png"]]) {
  await p.goto("file://" + resolve(html), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: png }); console.log(png);
}
await b.close();
