// Renders post.html to post.png (1080x1350). Usage: NODE_PATH=/opt/node-tools/node_modules node render.mjs
import { createRequire } from "node:module";
import { resolve } from "node:path";
const { chromium } = createRequire(import.meta.url)("playwright");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
await p.goto("file://" + resolve("post.html"), { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: "post.png" });
await b.close();
