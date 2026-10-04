// Renders the v2 Reel graphics (1080x1920): animated intro + end-card frame sequences and
// transparent text overlays. Frames are captured by seeking paused CSS animations.
// Usage: NODE_PATH=/opt/node-tools/node_modules node render-reels-v2.mjs
import { createRequire } from "node:module";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = resolve("../../../..");
const OUT = resolve("../build/v2");
const FPS = 30;
const file = (p) => "file://" + resolve(ROOT, p).replace(/ /g, "%20");
const S6 = "prompt six stop the scroll/images/";
const HOOK_FRAME = "file://" + resolve(OUT, "clip01-first.png");
const MARK = file("public/brand/official/homie-mark-light-on-charcoal.png");

const HEAD = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${"file://" + resolve("urbanist-local.css")}">`;
const base = `
:root{--cream:#f8f2e4;--char:#20231e;--sage:#9cac90;--sage-d:#71845f}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;font-family:Urbanist,sans-serif;background:transparent}
em{font-style:normal;color:var(--sage)}
.big{font-size:100px;line-height:1.02;font-weight:800;letter-spacing:-2px;color:#fff;text-align:center}
.fade-top{position:absolute;left:0;right:0;top:0;height:900px;background:linear-gradient(180deg,rgba(15,17,14,.8),rgba(15,17,14,.5) 45%,rgba(15,17,14,0))}
.fade-bot{position:absolute;left:0;right:0;bottom:0;height:520px;background:linear-gradient(0deg,rgba(15,17,14,.65),rgba(15,17,14,0))}
.pill{display:inline-flex;align-items:center;gap:14px;background:rgba(248,242,228,.96);color:var(--char);font-weight:700;font-size:42px;padding:16px 32px;border-radius:999px}
.dot{width:16px;height:16px;border-radius:50%;background:var(--sage-d)}
`;

// ---------- Intro (2.6s): three listing photos land as cards, then the facade card fills the screen.
const intro = `
<style>
body{background:var(--char)}
.bg{position:absolute;inset:-60px;background:url('${file(S6 + "02-front-facade.png")}') center/cover;filter:blur(38px) brightness(.45)}
.card{position:absolute;left:50%;top:56%;width:700px;height:1050px;margin:-525px 0 0 -350px;border-radius:30px;border:14px solid #fff;background-size:cover;background-position:center;box-shadow:0 40px 90px rgba(0,0,0,.55);opacity:0}
.card .pill{position:absolute;left:28px;bottom:28px;font-size:30px;padding:12px 22px}
.c1{background-image:url('${file(S6 + "05-kitchen.png")}');animation:land1 .45s cubic-bezier(.2,.8,.2,1) .10s forwards, away .5s ease-in 2.0s forwards}
.c2{background-image:url('${file(S6 + "04-living-room.png")}');animation:land2 .45s cubic-bezier(.2,.8,.2,1) .55s forwards, away .5s ease-in 2.0s forwards}
.c3{background-image:url('${HOOK_FRAME}');animation:land3 .45s cubic-bezier(.2,.8,.2,1) 1.0s forwards, fill .6s cubic-bezier(.6,0,.2,1) 2.0s forwards}
@keyframes land1{from{opacity:0;transform:translate(-60px,120px) rotate(-14deg) scale(1.25)}to{opacity:1;transform:translate(-70px,30px) rotate(-8deg)}}
@keyframes land2{from{opacity:0;transform:translate(60px,120px) rotate(14deg) scale(1.25)}to{opacity:1;transform:translate(70px,10px) rotate(6deg)}}
@keyframes land3{from{opacity:0;transform:translate(0,140px) rotate(-6deg) scale(1.25)}to{opacity:1;transform:translate(0,0) rotate(-1deg)}}
@keyframes away{to{opacity:0;transform:translate(0,200px) scale(.9)}}
@keyframes fill{from{opacity:1;transform:translate(0,0) rotate(-1deg)}to{opacity:1;top:0;left:0;margin:0;width:1080px;height:1920px;border-width:0;border-radius:0;transform:none}}
.c3 .pill{animation:out .2s linear 2.0s forwards}
.head{position:absolute;top:190px;left:60px;right:60px;opacity:0;animation:hin .4s ease-out .05s forwards, out .3s ease-in 2.0s forwards}
@keyframes hin{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}
@keyframes out{to{opacity:0}}
</style>
<div class="bg"></div>
<div class="head big">These are just<br>listing <em>photos</em>.</div>
<div class="card c1"><span class="pill"><span class="dot"></span>Listing photo</span></div>
<div class="card c2"><span class="pill"><span class="dot"></span>Listing photo</span></div>
<div class="card c3"><span class="pill"><span class="dot"></span>Listing photo</span></div>`;

// ---------- End card (2.6s)
const endCard = `
<style>
body{background:#42423f}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:56px}
.mark{width:300px;opacity:0;animation:pop .5s cubic-bezier(.2,.9,.3,1.3) .05s forwards}
.big{opacity:0;animation:up .45s ease-out .3s forwards}
.cta{opacity:0;animation:up .45s ease-out .6s forwards}
.cta .pill{background:var(--sage-d);color:#fff;font-size:46px;padding:20px 40px}
.handle{opacity:0;animation:up .45s ease-out .8s forwards;color:rgba(255,255,255,.7);font-size:38px;font-weight:600}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@keyframes up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}
</style>
<div class="wrap"><img class="mark" src="${MARK}">
<div class="big">Your listing photos.<br>A tour that <em>moves</em>.</div>
<div class="cta"><span class="pill">Try free · link in bio</span></div>
<div class="handle">@homie.app.ai</div></div>`;

// ---------- Static overlays (faded in/out by ffmpeg)
const top = (html, y = 250) => `<div class="fade-top"></div><div class="big" style="position:absolute;top:${y}px;left:60px;right:60px">${html}</div>`;
const label = (t) => `<div class="fade-bot"></div><div style="position:absolute;left:64px;bottom:300px"><span class="pill"><span class="dot"></span>${t}</span></div>`;
const overlays = {
  "r1-now-tour": top("Now it's a<br>home <em>tour</em>."),
  "r1-no-shoot": top("No shoot.<br>No editing.<br>No <em>prompts</em>."),
  "r1-same-photos": top("Same photos.<br>Now it <em>moves</em>."),
  "lbl-exterior": label("Exterior"),
  "lbl-living": label("Living room"),
  "lbl-kitchen": label("Kitchen"),
  "lbl-dining": label("Dining"),
  "lbl-bedroom": label("Bedroom"),
  "lbl-backyard": label("Backyard"),
  "r2-hook": top("No camera crew.<br>No editor.<br>No <em>prompts</em>.", 230),
  "r2-photos": `<div class="fade-bot" style="height:700px"></div><div style="position:absolute;left:0;right:0;bottom:330px;text-align:center"><span class="pill" style="font-size:48px">Built from listing photos</span></div>`,
  "r2-mid": top("Pick a style.<br>Get a <em>tour</em>.", 250),
};

const TMP = `${OUT}/.page.html`;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

async function load(html) {
  writeFileSync(TMP, HEAD + `<style>${base}</style>` + html);
  await page.goto("file://" + TMP, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
}

async function frames(name, html, seconds) {
  const dir = `${OUT}/${name}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await load(html);
  await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
  const n = Math.round(seconds * FPS);
  for (let i = 0; i < n; i++) {
    const ms = (i * 1000) / FPS;
    await page.evaluate((t) => document.getAnimations().forEach((a) => (a.currentTime = t)), ms);
    await page.screenshot({ path: `${dir}/${String(i).padStart(4, "0")}.png` });
  }
}

await frames("intro", intro, 2.6);
await frames("end", endCard, 2.6);
mkdirSync(`${OUT}/ov`, { recursive: true });
for (const [name, html] of Object.entries(overlays)) {
  await load(html);
  await page.screenshot({ path: `${OUT}/ov/${name}.png`, omitBackground: true });
}
await browser.close();
rmSync(TMP);
console.log("done");
