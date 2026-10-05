import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { rename } from "node:fs/promises";
import { probeVideo } from "./video-assembly.mjs";
const exec = promisify(execFile);

// Optional per-template edit layer, applied to the assembled film.
// config: { grid_reveal?: boolean, flash_cut?: boolean, grade?: "lights-on" }
const GRADES = {
  "lights-on": "colorbalance=rs=-0.04:bs=0.05:rh=0.05:bh=-0.04,eq=contrast=1.06:saturation=1.08,vignette=angle=PI/5,noise=alls=5:allf=t",
};
const TILE_STAGGER = 0.06;
const TILE_ORDER = [4, 1, 5, 7, 3, 2, 8, 6, 0]; // centre first, then around

export async function sceneCuts(path, threshold = 0.28) {
  const { stderr } = await exec("ffmpeg", ["-nostdin", "-v", "info", "-i", path, "-vf", `select='gt(scene,${threshold})',showinfo`, "-f", "null", "-"], { maxBuffer: 32 * 1024 * 1024, timeout: 300000 });
  return [...stderr.matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1]));
}

const nearest = (cuts, target, min = 0) => cuts.filter((c) => c > min).sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];

export function finishFilter({ width, height, duration, gridAt, flashAt, grade }) {
  const parts = [];
  let video = "[0:v]";
  if (gridAt != null) {
    const tw = Math.floor(width / 3), th = Math.floor(height / 3), start = gridAt; // the opening frame holds while the next shot's tiles land on it
    const end = (start + TILE_ORDER.length * TILE_STAGGER + 0.15).toFixed(3);
    parts.push(`${video}split=2[ga][gb]`, `[ga]trim=0:${gridAt},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=${duration}[g0]`, `[gb]trim=start=${gridAt},split=9${TILE_ORDER.map((i) => `[b${i}]`).join("")}`);
    TILE_ORDER.forEach((i, k) => {
      const x = (i % 3) * tw, y = Math.floor(i / 3) * th;
      parts.push(`[b${i}]crop=${tw}:${th}:${x}:${y}[t${i}]`, `[g${k}][t${i}]overlay=${x}:${y}:enable='gte(t,${(start + k * TILE_STAGGER).toFixed(3)})'[g${k + 1}]`);
    });
    const lines = [1, 2].flatMap((n) => [`drawbox=x=${tw * n - 1}:y=0:w=2:h=ih:color=white@0.30:t=fill:enable='lt(t,${end})'`, `drawbox=x=0:y=${th * n - 1}:w=iw:h=2:color=white@0.30:t=fill:enable='lt(t,${end})'`]);
    parts.push(`[g${TILE_ORDER.length}]${lines.join(",")}[grid]`);
    video = "[grid]";
  }
  if (flashAt != null) {
    const t = flashAt;
    parts.push(`color=c=white:s=${width}x${height}:r=30:d=${duration},format=rgba,fade=t=in:st=${(t - 0.07).toFixed(3)}:d=0.07:alpha=1,fade=t=out:st=${t.toFixed(3)}:d=0.2:alpha=1[flash]`, `${video}[flash]overlay=0:0:format=auto[fl]`);
    video = "[fl]";
  }
  parts.push(`${video}${grade ? `${GRADES[grade]},` : ""}trim=0:${duration},format=yuv420p[v]`);
  return parts.join(";");
}

// Rewrites `path` in place; duration, size and audio are unchanged.
export async function applyTemplateFinish(path, config) {
  if (!config || !(config.grid_reveal || config.flash_cut || config.grade)) return null;
  if (config.grade && !GRADES[config.grade]) throw new Error(`Unknown finish grade: ${config.grade}`);
  const probe = await probeVideo(path);
  const video = probe.streams.find((s) => s.codec_type === "video");
  const hasAudio = probe.streams.some((s) => s.codec_type === "audio");
  const duration = Number(probe.format.duration);
  const cuts = (config.grid_reveal || config.flash_cut) ? await sceneCuts(path) : [];
  // The hook cut sits in the first quarter; the exterior→interior cut near a third of the film.
  const gridAt = config.grid_reveal ? nearest(cuts.filter((c) => c < duration * 0.25), duration * 0.08, 0.5) ?? null : null;
  const flashAt = config.flash_cut ? nearest(cuts.filter((c) => c > (gridAt ?? 0) + 1), duration * 0.31) ?? null : null;
  const filter = finishFilter({ width: video.width, height: video.height, duration, gridAt, flashAt, grade: config.grade });
  const out = `${path}.finish.mp4`;
  await exec("ffmpeg", ["-nostdin", "-v", "error", "-y", "-filter_threads", "1", "-i", path, "-filter_complex", filter, "-map", "[v]", ...(hasAudio ? ["-map", "0:a:0", "-c:a", "copy"] : []), "-t", String(duration), "-c:v", "libx264", "-threads", "2", "-preset", "fast", "-crf", "19", "-maxrate", "12M", "-bufsize", "24M", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { timeout: 600000 });
  await rename(out, path);
  return { gridAt, flashAt };
}
