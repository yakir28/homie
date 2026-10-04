// Renders Instagram carousel slides (1080x1350) and Reel overlays (1080x1920) to PNG.
// Usage: node render.mjs   (from this directory; needs playwright + network for Google Fonts)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve("../../../..");
const OUT = resolve("../build");
const img = (p) => "file://" + resolve(ROOT, p).replace(/ /g, "%20");

const S6 = "prompt six stop the scroll/images/";
const P1 = "prompt one video/";
const MARK_LIGHT = img("public/brand/official/homie-mark-light-on-charcoal.png");

const css = `
:root{--cream:#f8f2e4;--char:#20231e;--ink:#45483f;--sage:#9cac90;--sage-d:#71845f;}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1350px;font-family:Urbanist,sans-serif;overflow:hidden;background:var(--char)}
.slide{position:relative;width:1080px;height:1350px;overflow:hidden}
.bg{position:absolute;inset:0;background-size:cover;background-position:center}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,22,19,.55) 0%,rgba(20,22,19,.15) 35%,rgba(20,22,19,.35) 60%,rgba(20,22,19,.9) 100%)}
.brand{position:absolute;top:56px;left:0;right:0;text-align:center;font-weight:700;font-size:30px;letter-spacing:.5px;color:#fff}
.brand.dark{color:var(--ink)}
.content{position:absolute;left:84px;right:84px}
.eyebrow{display:inline-block;font-size:26px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--char);background:var(--sage);padding:10px 20px;border-radius:999px;margin-bottom:30px}
h1,.sub{text-shadow:0 4px 30px rgba(0,0,0,.45)}
h1{font-size:118px;line-height:.98;font-weight:700;letter-spacing:-3px;color:#fff}
h2{font-size:84px;line-height:1.02;font-weight:700;letter-spacing:-2px;color:var(--char)}
em{font-style:normal;color:var(--sage)}
.dark em{color:var(--sage-d)}
.sub{margin-top:34px;font-size:38px;line-height:1.35;font-weight:500;color:rgba(255,255,255,.88)}
.dark .sub{color:var(--ink)}
.foot{position:absolute;bottom:56px;left:84px;right:84px;display:flex;justify-content:space-between;align-items:center;font-size:26px;font-weight:600;color:rgba(255,255,255,.75);letter-spacing:1px}
.dark .foot{color:var(--ink)}
.cream{background:var(--cream)}
.num{font-size:200px;font-weight:800;line-height:1;color:var(--sage);letter-spacing:-6px}
.grid{display:grid;gap:14px}
.grid div{background-size:cover;background-position:center;border-radius:18px}
.card{border-radius:22px;overflow:hidden;position:relative;background-size:cover;background-position:center}
.chip{position:absolute;left:18px;bottom:18px;background:rgba(248,242,228,.95);color:var(--char);font-weight:700;font-size:24px;padding:10px 18px;border-radius:999px}
.btn{display:inline-flex;align-items:center;gap:14px;background:var(--sage-d);color:#fff;font-weight:700;font-size:36px;padding:24px 44px;border-radius:999px}
.pill{display:inline-block;border:2px solid currentColor;border-radius:999px;padding:12px 26px;font-weight:600;font-size:28px}
`;

const brand = (dark) => `<div class="brand ${dark ? "dark" : ""}">Homie</div>`;
const foot = (l, r = "Swipe →") => `<div class="foot"><span>${l}</span><span>${r}</span></div>`;

function photo({ bg, eyebrow = "", title, sub = "", top = null, footL = "homie-app.com", footR }) {
  const pos = top != null ? `top:${top}px` : "bottom:150px";
  return `<div class="slide"><div class="bg" style="background-image:url('${bg}')"></div><div class="shade"></div>
  ${brand()}<div class="content" style="${pos}">${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ""}<h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}</div>${foot(footL, footR)}</div>`;
}

function step({ n, title, sub, visual, footR }) {
  return `<div class="slide cream dark">${brand(true)}
  <div class="content" style="top:150px"><div class="num">${n}</div><h2 style="margin-top:10px">${title}</h2><div class="sub" style="margin-top:22px">${sub}</div></div>
  <div class="content" style="bottom:130px">${visual}</div>${foot("homie-app.com", footR)}</div>`;
}

const photoGrid = (list, h = 520) =>
  `<div class="grid" style="grid-template-columns:repeat(${list.length > 4 ? 3 : 2},1fr);height:${h}px">${list
    .map((p) => `<div style="background-image:url('${img(p)}')"></div>`)
    .join("")}</div>`;

const templateCards = `<div style="display:flex;gap:18px;height:560px">${[
  [S6 + "02-front-facade.png", "Stop the Scroll"],
  [P1 + "05-living-room.png", "Reflection Reveal"],
  [S6 + "08-backyard.png", "Golden Hour"],
]
  .map(([p, l], i) => `<div class="card" style="flex:1;background-image:url('${img(p)}');${i === 1 ? "outline:6px solid var(--sage-d);outline-offset:4px" : ""}"><span class="chip">${l}</span></div>`)
  .join("")}</div>`;

const frameStrip = `<div style="display:flex;gap:10px;height:520px;align-items:center">${[
  P1 + "01-exterior-establishing.png", P1 + "02-front-walkway.png", P1 + "04-entry-foyer.png", P1 + "05-living-room.png", P1 + "08-backyard.png",
]
  .map((p, i) => `<div class="card" style="flex:1;height:${420 + (i % 2) * 100}px;background-image:url('${img(p)}')"></div>`)
  .join("")}</div>`;

const approve = `<div style="display:flex;gap:40px;align-items:center;height:560px">
  <div class="card" style="width:315px;height:560px;background-image:url('${img(S6 + "04-living-room.png")}');border:10px solid var(--char);border-radius:40px"></div>
  <div style="flex:1"><div style="font-size:30px;font-weight:600;color:var(--ink);margin-bottom:22px">Your tour is ready.</div>
  <div class="btn">✓ Approve</div><div style="margin-top:22px"><span class="pill" style="color:var(--ink)">↻ Try another style</span></div></div></div>`;

const carousels = {
  "how-it-works": [
    photo({ bg: img(S6 + "02-front-facade.png"), eyebrow: "How Homie works", title: "Listing photos<br>in. A home tour<br>that <em>moves</em> out.", sub: "No camera. No editing. No prompts." }),
    step({ n: "01", title: "Import your <em>listing</em>", sub: "Start with the property photos you already have.", visual: photoGrid([S6 + "01-aerial-drone.png", S6 + "04-living-room.png", S6 + "05-kitchen.png", S6 + "07-primary-bedroom.png", S6 + "06-dining-room.png", S6 + "08-backyard.png"]) }),
    step({ n: "02", title: "Pick a <em>style</em>, not a prompt", sub: "Browse curated video templates. Cinematic, fast-paced, golden hour.", visual: templateCards }),
    step({ n: "03", title: "Generate the <em>tour</em>", sub: "Homie turns your photos into a walkthrough. The creative direction runs behind the scenes.", visual: frameStrip }),
    step({ n: "04", title: "Review. <em>Approve.</em> Share.", sub: "Nothing is final until you say so.", visual: approve }),
    photo({ bg: img(P1 + "08-backyard.png"), eyebrow: "Try it free", title: "Your next<br>listing deserves<br>to <em>move</em>.", sub: "No credit card needed. Link in bio.", footR: "@homie.app.ai" }),
  ],
  "3-mistakes": [
    photo({ bg: img(S6 + "04-living-room.png"), eyebrow: "For real estate agents", title: "3 mistakes that<br>make buyers<br><em>scroll past</em><br>your listing." }),
    step({ n: "01", title: "The photo <em>dump</em>", sub: "Ten stills in a row ask buyers to do the work. Give them a walkthrough instead.", visual: photoGrid([S6 + "03-entry.png", S6 + "05-kitchen.png", S6 + "06-dining-room.png", S6 + "07-primary-bedroom.png"], 540) }),
    step({ n: "02", title: "Leading with the <em>weakest</em> shot", sub: "The first frame decides if they stay. Open with your best light, room or view.", visual: `<div class="card" style="height:560px;background-image:url('${img(S6 + "08-backyard.png")}')"><span class="chip">✓ Open here</span></div>` }),
    step({ n: "03", title: "No <em>story</em>", sub: "Random room order feels like a catalog. Outside → entry → living → kitchen → backyard feels like a visit.", visual: frameStrip }),
    photo({ bg: img(S6 + "05-kitchen.png"), eyebrow: "The fix", title: "Same photos.<br>Now it's a<br><em>tour</em>.", sub: "Homie turns the listing photos you already have into a home-tour video." }),
    `<div class="slide cream dark">${brand(true)}<div class="content" style="top:200px;text-align:center"><h2>Save this for<br>your next <em>listing</em>.</h2><div class="sub">Follow for more listing-marketing tips.</div><div style="margin-top:50px"><span class="btn">@homie.app.ai</span></div></div><div class="content" style="bottom:130px"><div class="card" style="height:380px;background-image:url('${img(P1 + "05-living-room.png")}')"></div></div>${foot("homie-app.com", "")}</div>`,
  ],
};

// Reel overlays (transparent, 1080x1920)
const reelCss = `body{width:1080px;height:1920px;background:transparent}
.ov{position:absolute;left:70px;right:70px;text-align:center}
.big{font-size:104px;line-height:1.02;font-weight:800;letter-spacing:-2px;color:#fff;text-shadow:0 6px 40px rgba(0,0,0,.55)}
.fade{position:absolute;left:0;right:0;top:0;height:1000px;background:linear-gradient(180deg,rgba(15,17,14,.78) 0%,rgba(15,17,14,.55) 45%,rgba(15,17,14,0) 100%)}
.tag{display:inline-block;background:rgba(248,242,228,.96);color:#20231e;font-weight:700;font-size:44px;padding:16px 34px;border-radius:999px}`;
const reelOverlays = {
  "r1-hook": `<div class="fade"></div><div class="ov" style="top:300px"><div class="big">These are just<br>listing <em>photos</em>.</div></div>`,
  "r1-turn": `<div class="fade"></div><div class="ov" style="top:300px"><div class="big">Watch them turn<br>into a <em>tour</em>.</div></div>`,
  "r2-hook": `<div class="fade"></div><div class="ov" style="top:280px"><div class="big">No camera crew.<br>No editor.<br>No <em>prompts</em>.</div></div><div class="ov" style="bottom:330px"><span class="tag">Just your listing photos</span></div>`,
  "end": `<div style="position:absolute;inset:0;background:#20231e;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:50px">
    <img src="${MARK_LIGHT}" style="width:300px;border-radius:40px">
    <div class="big" style="text-shadow:none">Your listing photos.<br>A tour that <em>moves</em>.</div>
    <span class="tag" style="background:#71845f;color:#fff">Try free · link in bio</span></div>`,
};

mkdirSync(OUT, { recursive: true });
const HEAD = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${"file://" + resolve("urbanist-local.css")}">`;
const TMP = `${OUT}/.page.html`;
async function shot(page, html, path, opts = {}) {
  writeFileSync(TMP, HEAD + html);
  await page.goto("file://" + TMP, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path, ...opts });
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
for (const [name, slides] of Object.entries(carousels)) {
  mkdirSync(`${OUT}/${name}`, { recursive: true });
  for (const [i, html] of slides.entries()) {
    await shot(page, `<style>${css}</style>${html}`, `${OUT}/${name}/${String(i + 1).padStart(2, "0")}.png`);
  }
}
await page.setViewportSize({ width: 1080, height: 1920 });
mkdirSync(`${OUT}/overlays`, { recursive: true });
for (const [name, html] of Object.entries(reelOverlays)) {
  await shot(page, `<style>${css}${reelCss}</style>${html}`, `${OUT}/overlays/${name}.png`, { omitBackground: true });
}
await browser.close();
rmSync(TMP);
console.log("done");
