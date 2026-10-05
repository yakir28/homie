// Graphics timeline for the "Comment PROMPT" UGC edit (split-screen, reference: ugc/reference/ref-01).
// Reads work/timing.json (from align.py) and writes work/timeline.html + work/layout.json.
// Top half (0-960px) = product proof panel, bottom half = avatar; single-word caption pill on the seam.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve("../../../..");
const f = (p) => "file://" + resolve(ROOT, p).replace(/ /g, "%20");
const T = JSON.parse(readFileSync("work/timing.json", "utf8"));
const P = T.phrases;
const END = T.duration;
const s = (x) => x.toFixed(3) + "s";
const anim = (...a) => `animation:${a.join(",")};`;

// Video holes (the build script overlays footage exactly here, under this graphics layer).
const HOLES = {
  after: { x: 470, y: 130, w: 390, h: 694, t0: P[0].start, t1: P[1].start },
  tour: { x: 320, y: 70, w: 440, h: 782, t0: P[5].start, t1: END },
};
writeFileSync("work/layout.json", JSON.stringify({ holes: HOLES, full: { t0: P[1].start, t1: P[2].start } }, null, 1));

const S6 = "prompt six stop the scroll/images/";
const PD = "prompt seven picture day/images/";
const PT = "prompt four pulse tour/images/";
const RR = "prompt five reflection reveal/images/";

const css = `
@import url('${f("social/instagram/week-01/src/urbanist-local.css")}');
:root{--char:#20231e;--cream:#f9f1e2;--sage:#9cac90;--sage-d:#71845f;--panel:#ecebe7;--ease:cubic-bezier(.16,1,.3,1)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:transparent;font-family:Urbanist,sans-serif}
.abs{position:absolute}
.panel{position:absolute;left:0;top:0;width:1080px;height:960px;overflow:hidden;background:var(--bg)}
.panel.holed{background:transparent}
.hole{position:absolute;border-radius:30px;box-shadow:0 0 0 3000px var(--bg);outline:10px solid #fff;outline-offset:-1px}
.card{position:absolute;border-radius:24px;border:9px solid #fff;background-size:cover;background-position:center;box-shadow:0 24px 50px rgba(0,0,0,.25)}
.lbl{position:absolute;font-weight:800;font-size:40px;color:var(--char);letter-spacing:-.01em}
.chip{display:inline-flex;align-items:center;gap:12px;background:var(--char);color:var(--cream);font-weight:700;font-size:34px;padding:12px 24px;border-radius:999px}
.pill{position:absolute;left:0;right:0;top:960px;transform:translateY(-50%);text-align:center}
.pill span{display:inline-block;background:rgba(20,22,19,.88);color:#fff;font-weight:800;font-size:46px;padding:10px 26px;border-radius:16px;letter-spacing:-.01em}
.big{position:absolute;left:60px;right:60px;text-align:center;color:#fff;font-weight:800;line-height:.95;letter-spacing:-.03em;text-shadow:0 6px 40px rgba(0,0,0,.45)}
.w{display:inline-block;overflow:hidden;vertical-align:top;padding:0 .16em .08em;margin:0 -.12em}
.w>i{display:inline-block;font-style:normal}
.mk{position:relative;display:inline-block;color:var(--char);text-shadow:none}
.mk>b{position:absolute;left:-.08em;right:-.08em;top:.1em;bottom:.02em;background:var(--sage);border-radius:.08em;transform-origin:left;z-index:-1}
@keyframes show{from{visibility:hidden}to{visibility:visible}}
@keyframes hide{to{visibility:hidden}}
@keyframes rise{from{transform:translateY(110%)}to{transform:none}}
@keyframes mark{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes pop{from{opacity:0;transform:translateY(30px) scale(.92)}to{opacity:1;transform:none}}
@keyframes fanL{from{opacity:0;transform:translate(120px,80px) rotate(0)}to{opacity:1;transform:rotate(-9deg)}}
@keyframes fanR{from{opacity:0;transform:translate(-120px,80px) rotate(0)}to{opacity:1;transform:rotate(9deg)}}
@keyframes type{from{width:0}to{width:var(--w)}}
@keyframes blink{50%{opacity:0}}
@keyframes move{from{transform:translate(var(--fx),var(--fy))}to{transform:none}}
@keyframes press{50%{transform:scale(.86)}}
@keyframes ring{from{outline-color:transparent}to{outline-color:var(--sage-d)}}
@keyframes lift{to{transform:translateY(-18px) scale(1.04)}}
`;

// a scene = panel visible only within [t0, t1)
const scene = (t0, t1, bg, inner) =>
  `<div class="panel${inner.includes('class="hole"') ? " holed" : ""}" style="--bg:${bg};visibility:hidden;${anim(`show 0s linear ${s(t0)} forwards`, `hide 0s linear ${s(t1)} forwards`)}">${inner}</div>`;

// ---- P1: Before / After
const h = HOLES.after;
const p1 = scene(P[0].start - 0.001, P[1].start, "var(--panel)", `
  <div class="hole" style="left:${h.x}px;top:${h.y}px;width:${h.w}px;height:${h.h}px"></div>
  <div class="card" style="left:200px;top:330px;width:260px;height:462px;background-image:url('${f(S6 + "02-front-facade.png")}');${anim(`pop .45s var(--ease) ${s(P[0].start)} both`)}"></div>
  <div class="lbl" style="left:255px;top:270px;${anim(`pop .4s var(--ease) ${s(P[0].start)} both`)}">Before</div>
  <div class="lbl" style="left:610px;top:62px;${anim(`pop .4s var(--ease) ${s(P[0].start + 0.15)} both`)}">After</div>`);

// ---- P3: listing photos fan
const photos = [S6 + "04-living-room.png", S6 + "05-kitchen.png", S6 + "02-front-facade.png", S6 + "07-primary-bedroom.png"];
const fan = [["fanL", 170, 170, -9], ["fanL", 330, 120, -4], ["fanR", 490, 120, 4], ["fanR", 650, 170, 9]];
const p3 = scene(P[2].start, P[3].start, "var(--panel)", photos.map((p, i) => {
  const [k, x, y] = fan[i];
  return `<div class="card" style="left:${x}px;top:${y}px;width:260px;height:400px;background-image:url('${f(p)}');${anim(`${k} .5s var(--ease) ${s(P[2].start + i * 0.12)} both`)}"></div>`;
}).join("") + `<div class="abs" style="left:0;right:0;top:640px;text-align:center;${anim(`pop .4s var(--ease) ${s(P[2].start + 0.5)} both`)}"><span class="chip">Your listing photos</span></div>`);

// ---- P4: browser + typing URL
const url = "homie-app.com";
const p4 = scene(P[3].start, P[4].start, "var(--panel)", `
  <div class="abs" style="left:90px;right:90px;top:250px;height:420px;background:#fff;border-radius:28px;box-shadow:0 30px 60px rgba(0,0,0,.18);${anim(`pop .4s var(--ease) ${s(P[3].start)} both`)}">
    <div style="display:flex;gap:12px;padding:26px 30px"><i style="width:22px;height:22px;border-radius:50%;background:#e5e3dc"></i><i style="width:22px;height:22px;border-radius:50%;background:#e5e3dc"></i><i style="width:22px;height:22px;border-radius:50%;background:#e5e3dc"></i></div>
    <div style="margin:10px 40px;height:110px;border-radius:999px;background:#f1efe9;display:flex;align-items:center;padding:0 40px;font-size:56px;font-weight:700;color:var(--char)">
      <span style="display:inline-block;overflow:hidden;white-space:nowrap;--w:${url.length * 0.56}em;width:0;${anim(`type .9s steps(${url.length}) ${s(P[3].start + 0.35)} forwards`)}">${url}</span>
      <span style="display:inline-block;width:5px;height:64px;background:var(--sage-d);margin-left:6px;${anim(`blink .8s steps(1) 0s infinite`)}"></span>
    </div>
    <div style="margin:44px 40px 0;display:flex;gap:18px">${[0, 1, 2].map((i) => `<div style="flex:1;height:120px;border-radius:18px;background:#f1efe9"></div>`).join("")}</div>
  </div>`);

// ---- P5: pick a style (3 template cards, cursor clicks the middle one)
const styles = [[RR + "02-clean-facade.png", "Cinematic"], [PD + "02-facade.png", "Fast-paced"], [PT + "02-front-approach.png", "Viral trends"]];
const tClick = P[4].start + 0.55;
const p5 = scene(P[4].start, P[5].start, "var(--panel)", styles.map(([img, name], i) => `
  <div class="abs" style="left:${90 + i * 310}px;top:170px;width:280px;text-align:center;${anim(`pop .4s var(--ease) ${s(P[4].start + i * 0.08)} both`, ...(i === 1 ? [`lift .3s var(--ease) ${s(tClick)} forwards`] : []))}">
    <div class="card" style="position:relative;width:280px;height:460px;background-image:url('${f(img)}');outline:8px solid transparent;outline-offset:4px;${i === 1 ? anim(`ring .2s linear ${s(tClick)} forwards`) : ""}"></div>
    <div class="lbl" style="position:relative;margin-top:22px;font-size:36px">${name}</div>
  </div>`).join("") + `
  <svg class="abs" width="70" height="70" viewBox="0 0 24 24" style="left:560px;top:520px;--fx:260px;--fy:260px;${anim(`move .5s var(--ease) ${s(P[4].start + 0.05)} both`, `press .2s ease ${s(tClick)} 1`)}"><path d="M4 2l16 10-7 1.5L9.5 21z" fill="#20231e" stroke="#fff" stroke-width="1.5"/></svg>`);

// ---- P6 + P7: finished tour card
const t = HOLES.tour;
const p67 = scene(P[5].start, END + 1, "var(--cream)", `
  <div class="hole" style="left:${t.x}px;top:${t.y}px;width:${t.w}px;height:${t.h}px"></div>
  <div class="abs" style="left:${t.x + 22}px;top:${t.y + 22}px;${anim(`pop .4s var(--ease) ${s(P[5].start + 0.2)} both`)}"><span class="chip" style="font-size:28px;padding:10px 20px">Home tour</span></div>`);

// ---- P2: full-frame big text "no camera crew."
const big = (t0, t1, top, size, lines) => {
  let d = t0;
  return `<div class="big" style="top:${top}px;font-size:${size}px;visibility:hidden;${anim(`show 0s linear ${s(t0)} forwards`, `hide 0s linear ${s(t1)} forwards`)}">${lines
    .map((ln) => `<div>${ln.map(([w, m]) => {
      const html = m ? `<span class="mk"><b style="${anim(`mark .3s var(--ease) ${s(d + 0.35)} both`)}"></b>${w}</span>` : w;
      const out = `<span class="w"><i style="${anim(`rise .45s var(--ease) ${s(d)} both`)}">${html}</i></span>`;
      d += 0.12;
      return out;
    }).join(" ")}</div>`).join("")}</div>`;
};
const p2words = P[1].words;
const p2 = big(P[1].start, P[2].start, 560, 170, [[["no"]], [["camera"]], [["crew.", true]]]);

// ---- P7 CTA big text over the tour card area
const p7 = big(P[6].start, END + 1, 600, 100, [[["comment"]], [["“PROMPT”", true]]]);

// ---- seam caption pill: one word at a time (hidden during the full-frame P2 beat)
const pill = P.flatMap((ph, i) => (i === 1 ? [] : ph.words)).map((w) =>
  `<div class="pill" style="visibility:hidden;${anim(`show 0s linear ${s(w.start)} forwards`, `hide 0s linear ${s(w.end)} forwards`)}"><span>${w.w.replace(/[.,]$/, "")}</span></div>`).join("");

writeFileSync("work/timeline.html", `<!doctype html><meta charset="utf-8"><style>${css}</style>${p1}${p3}${p4}${p5}${p67}${p2}${p7}${pill}`);
console.log("timeline written; scenes:", P.map((p) => `${p.start}-${p.end}`).join(" | "));
