// Generates the graphics timelines (HTML, CSS-only animation) for the v3 Reels, following
// .claude/skills/homie-reel. Every frame is a pure function of time; render with
// .claude/skills/homie-reel/scripts/render-frames.mjs.
// Usage: node timelines.mjs   (writes work/reel-1.html and work/reel-2.html)
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve("../../..");
const WORK = resolve("work");
const f = (p) => "file://" + resolve(ROOT, p).replace(/ /g, "%20");
const FONT = f("social/instagram/week-01/src/urbanist-local.css");
const WORDMARK = f("public/brand/official/homie-wordmark-dark-on-cream.png");

const css = `
:root{--char:#20231e;--cream:#f9f1e2;--sage:#9cac90;--sage-d:#71845f;--ease:cubic-bezier(.16,1,.3,1)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:transparent;font-family:Urbanist,sans-serif}
.abs{position:absolute}
.block{position:absolute;left:70px;right:70px;text-align:center}
.line{display:block;font-weight:800;font-size:128px;line-height:.95;letter-spacing:-.03em;color:#fff;text-shadow:0 4px 30px rgba(0,0,0,.35)}
.w{display:inline-block;overflow:hidden;vertical-align:top;padding:0 .09em .06em;margin:0 -.06em}
.w>i{display:inline-block;font-style:normal;position:relative;z-index:1}
.mk{position:relative;display:inline-block}
.mk>b{position:absolute;left:-.08em;right:-.08em;top:.1em;bottom:.02em;background:var(--sage);border-radius:.08em;transform-origin:left;z-index:0}
.mk>i{position:relative;z-index:1;font-style:normal}
.scrim{position:absolute;left:-140px;right:-140px;border-radius:50%;background:radial-gradient(closest-side,rgba(10,12,9,.55),rgba(10,12,9,0));filter:blur(10px)}
.chip{position:absolute;left:70px;bottom:440px;overflow:hidden;padding:0 4px}
.chip>div{display:flex;align-items:center;gap:18px;background:rgba(20,22,19,.58);border-radius:22px;padding:14px 28px 14px 14px;color:var(--cream);font-weight:700;font-size:38px}
.chip span{display:inline-grid;place-items:center;width:56px;height:56px;border-radius:14px;background:var(--sage);color:var(--char);font-size:26px;font-weight:800}
@keyframes rise{from{transform:translateY(110%)}to{transform:none}}
@keyframes mark{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes ink{from{color:#fff;text-shadow:0 4px 30px rgba(0,0,0,.35)}to{color:var(--char);text-shadow:none}}
@keyframes exit{to{transform:translateY(-40px);opacity:0}}
@keyframes fadein{from{opacity:0}to{opacity:1}}
@keyframes fadeout{to{opacity:0}}
@keyframes slidein{from{transform:translateX(-110%)}to{transform:none}}
@keyframes slideout{to{transform:translateX(-110%)}}
@keyframes up{from{transform:translateY(100%)}to{transform:none}}
@keyframes pop{from{opacity:0;transform:translateY(40px) scale(.9)}to{opacity:1;transform:none}}
`;

const anim = (...a) => `animation:${a.join(",")};`;

// Kinetic text block. lines: array of strings; `*word*` marks the emphasized word.
// stagger per word; lineGap = extra delay between lines (beats for stacked lines).
function text({ t0, t1, lines, top = 270, size = 128, lineGap = 0, markAt }) {
  let delay = t0;
  let lastLand = t0;
  const html = lines
    .map((ln, li) => {
      if (li > 0) delay += lineGap;
      const words = ln.split(" ").map((w) => {
        const d = delay;
        delay += 0.07;
        lastLand = d + 0.5;
        const m = w.match(/^\*(.+)\*(.*)$/);
        if (m) {
          return { d, marked: true, word: m[1], tail: m[2] };
        }
        return { d, word: w };
      });
      return `<span class="line" style="font-size:${size}px">${words
        .map((w) =>
          w.marked
            ? `<span class="w"><i style="${anim(`rise .5s var(--ease) ${w.d}s both`)}"><span class="mk"><b style="${anim(`mark .35s var(--ease) MARK s both`)}"></b><i style="${anim(`ink .2s linear MARK s both`)}">${w.word}</i></span>${w.tail}</i></span>`
            : `<span class="w"><i style="${anim(`rise .5s var(--ease) ${w.d}s both`)}">${w.word}</i></span>`,
        )
        .join(" ")}</span>`;
    })
    .join("");
  const mt = (markAt ?? lastLand + 0.05).toFixed(3);
  const h = lines.length * size * 0.95;
  return `<div class="abs" style="left:0;right:0;top:0;bottom:0;${anim(`exit .25s ease-in ${t1}s forwards`)}">
    <div class="scrim" style="top:${top - 120}px;height:${h + 240}px;${anim(`fadein .3s ease-out ${t0}s both`)}"></div>
    <div class="block" style="top:${top}px">${html.replaceAll("MARK s", mt + "s")}</div></div>`;
}

function label({ t0, t1, idx, name }) {
  return `<div class="chip"><div style="${anim(`slidein .45s var(--ease) ${t0}s both`, `slideout .3s ease-in ${t1}s forwards`)}"><span>${String(idx).padStart(2, "0")}</span>${name}</div></div>`;
}

function endCard(t0) {
  const s = (d) => (t0 + d).toFixed(3);
  return `<div class="abs" style="inset:0;background:var(--cream);${anim(`up .55s var(--ease) ${t0}s both`)}">
    <div class="abs" style="left:0;right:0;top:520px;text-align:center">
      <img src="${WORDMARK}" style="width:1000px;margin:-380px 0 -420px;${anim(`pop .5s var(--ease) ${s(0.35)}s both`)}">
    </div>
    <div class="block" style="top:860px">
      <span class="line" style="font-size:88px;color:var(--char);text-shadow:none"><span class="w"><i style="${anim(`rise .5s var(--ease) ${s(0.55)}s both`)}">Your listing photos.</i></span></span>
      <span class="line" style="font-size:88px;color:var(--char);text-shadow:none"><span class="w"><i style="${anim(`rise .5s var(--ease) ${s(0.65)}s both`)}">A tour that</i></span> <span class="w"><i style="${anim(`rise .5s var(--ease) ${s(0.72)}s both`)}"><span class="mk"><b style="${anim(`mark .35s var(--ease) ${s(1.15)}s both`)}"></b><i>moves.</i></span></i></span></span>
    </div>
    <div class="abs" style="left:0;right:0;top:1150px;text-align:center;${anim(`pop .45s var(--ease) ${s(1.0)}s both`)}">
      <span style="display:inline-block;background:var(--sage-d);color:#fff;font-weight:700;font-size:48px;padding:22px 46px;border-radius:999px">Try free · link in bio</span>
      <div style="margin-top:34px;color:rgba(32,35,30,.6);font-weight:600;font-size:38px">@homie.app.ai</div>
    </div></div>`;
}

const page = (body) => `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${FONT}"><style>${css}</style>${body}`;

// ---------------- Reel 1: photo cards -> Stop the Scroll tour ----------------
const S6 = "prompt six stop the scroll/images/";
const HOOK = "file://" + resolve(WORK, "clip01-first.png");
const cards = `
<style>
.bgph{position:absolute;inset:-60px;background:url('${f(S6 + "02-front-facade.png")}') center/cover;filter:blur(38px) brightness(.42)}
.card{position:absolute;left:50%;top:57%;width:700px;height:1050px;margin:-525px 0 0 -350px;border-radius:30px;border:14px solid #fff;background-size:cover;background-position:center;box-shadow:0 40px 90px rgba(0,0,0,.55);opacity:0}
.tag{position:absolute;left:24px;bottom:24px;display:flex;align-items:center;gap:12px;background:rgba(249,241,226,.96);color:var(--char);font-weight:700;font-size:30px;padding:10px 20px;border-radius:999px}
.tag:before{content:"";width:14px;height:14px;border-radius:50%;background:var(--sage-d)}
@keyframes land1{from{opacity:0;transform:translate(-60px,140px) rotate(-14deg) scale(1.2)}to{opacity:1;transform:translate(-80px,30px) rotate(-8deg)}}
@keyframes land2{from{opacity:0;transform:translate(60px,140px) rotate(14deg) scale(1.2)}to{opacity:1;transform:translate(80px,10px) rotate(6deg)}}
@keyframes land3{from{opacity:0;transform:translate(0,160px) rotate(-6deg) scale(1.2)}to{opacity:1;transform:rotate(-1deg)}}
@keyframes away{to{opacity:0;transform:translateY(240px) scale(.9)}}
@keyframes fill{from{opacity:1;transform:rotate(-1deg)}to{opacity:1;top:0;left:0;margin:0;width:1080px;height:1920px;border-width:0;border-radius:0;transform:none;box-shadow:none}}
</style>
<div class="abs" style="inset:0;${anim("fadeout .01s linear 2.6s forwards")}">
  <div class="bgph" style="${anim("fadeout .5s ease-in 2.0s forwards")}"></div>
  <div class="card" style="background-image:url('${f(S6 + "05-kitchen.png")}');${anim("land1 .5s var(--ease) .45s forwards", "away .45s ease-in 2.0s forwards")}"><span class="tag">Listing photo</span></div>
  <div class="card" style="background-image:url('${f(S6 + "04-living-room.png")}');${anim("land2 .5s var(--ease) .95s forwards", "away .45s ease-in 2.0s forwards")}"><span class="tag">Listing photo</span></div>
  <div class="card" style="background-image:url('${HOOK}');${anim("land3 .5s var(--ease) 1.45s forwards", "fill .6s cubic-bezier(.65,0,.25,1) 2.0s forwards")}"><span class="tag" style="${anim("fadeout .15s linear 2.0s forwards")}">Listing photo</span></div>
</div>`;

const rooms = ["Exterior", "Living room", "Kitchen", "Dining", "Bedroom", "Backyard"];
const reel1 = page(
  cards +
    text({ t0: 0.05, t1: 1.95, lines: ["These are just", "listing *photos.*"], top: 240, size: 112 }) +
    rooms.map((name, k) => label({ t0: 2.6 + 2.4 * k + 0.35, t1: 2.6 + 2.4 * k + 2.15, idx: k + 1, name })).join("") +
    text({ t0: 2.85, t1: 5.0, lines: ["Now it's a", "home *tour.*"] }) +
    text({ t0: 7.5, t1: 11.6, lines: ["No shoot.", "No editing.", "No *prompts.*"], lineGap: 0.45 }) +
    text({ t0: 14.75, t1: 16.85, lines: ["Same photos.", "Now it *moves.*"] }) +
    endCard(17.0),
);

// ---------------- Reel 2: Picture Day template ----------------
const PD = "prompt seven picture day/images/";
const thumbs = ["02-facade.png", "04-living-room.png", "05-kitchen.png", "08-backyard.png"];
const strip = `
<div class="abs" style="left:0;right:0;bottom:440px;text-align:center;${anim("exit .3s ease-in 8.3s forwards")}">
  <div style="display:inline-flex;gap:16px">${thumbs
    .map((t, i) => `<div style="width:190px;height:250px;border-radius:20px;border:8px solid #fff;background:url('${f(PD + t)}') center/cover;box-shadow:0 20px 40px rgba(0,0,0,.45);transform:rotate(${[-4, 2, -2, 4][i]}deg);${anim(`pop .45s var(--ease) ${(3.7 + i * 0.18).toFixed(2)}s both`)}"></div>`)
    .join("")}</div>
  <div style="margin-top:26px;${anim("pop .45s var(--ease) 4.6s both")}"><span style="display:inline-block;background:rgba(20,22,19,.6);color:var(--cream);font-weight:700;font-size:40px;padding:14px 30px;border-radius:999px">Built from these listing photos</span></div>
</div>`;
const platforms = `
<div class="abs" style="left:0;right:0;top:450px;text-align:center;${anim("exit .3s ease-in 17.2s forwards")}">${["Reels", "TikTok", "Stories"]
  .map((p, i) => `<span style="display:inline-block;margin:0 10px;background:rgba(249,241,226,.96);color:var(--char);font-weight:800;font-size:46px;padding:18px 36px;border-radius:999px;${anim(`pop .45s var(--ease) ${(14.9 + i * 0.25).toFixed(2)}s both`)}">${p}</span>`)
  .join("")}</div>`;

const reel2 = page(
  text({ t0: 0.1, t1: 3.25, lines: ["No camera crew.", "No editor.", "No *prompts.*"], lineGap: 0.4, size: 118 }) +
    strip +
    text({ t0: 9.15, t1: 12.25, lines: ["Pick a style.", "Get a *tour.*"] }) +
    text({ t0: 14.65, t1: 17.2, lines: ["Ready for"], size: 104, top: 300 }) +
    platforms +
    endCard(17.6),
);

mkdirSync(WORK, { recursive: true });
writeFileSync(`${WORK}/reel-1.html`, reel1);
writeFileSync(`${WORK}/reel-2.html`, reel2);
console.log("timelines written");
