import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";
const exec = promisify(execFile);

export async function probeVideo(path) {
  const { stdout } = await exec("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path]);
  return JSON.parse(stdout);
}

export function outputDimensions(resolution, aspectRatio) {
  const shortSide = { "480p": 480, "720p": 720, "1080p": 1080, "4k": 2160 }[resolution];
  if (!shortSide || !["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].includes(aspectRatio)) throw new Error("Unsupported output format.");
  const [w, h] = aspectRatio.split(":").map(Number);
  return [w, h].map((n) => Math.round(shortSide * n / Math.min(w, h) / 2) * 2);
}

// Normalize each shot before concatenating so the last scene survives the edit.
export async function assembleVideo(clips, shots, outputPath, { duration, aspectRatio, resolution }) {
  if (!clips.length || clips.length !== shots.length) throw new Error("Incomplete shot outputs.");
  const [width, height] = outputDimensions(resolution, aspectRatio);
  const edited = [];
  for (let i = 0; i < clips.length; i++) {
    const shot = shots[i];
    const target = shot.editDuration ?? shot.duration;
    const probe = await probeVideo(clips[i]);
    const video = probe.streams.find((s) => s.codec_type === "video");
    const actual = Number(video?.duration ?? probe.format?.duration);
    if (!video || !Number.isFinite(actual) || actual < shot.duration - 0.25) throw new Error(`Shot ${i + 1} is missing or shorter than its requested duration.`);
    const path = `${outputPath}.shot-${i}.mp4`;
    const hasAudio = shot.generateAudio === true && probe.streams.some((s) => s.codec_type === "audio");
    const input = ["-i", clips[i], ...(hasAudio ? [] : ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"])];
    const speed = target / shot.duration;
    const videoFilter = `trim=duration=${shot.duration},setpts=${speed}*(PTS-STARTPTS),scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`;
    // atempo accepts 0.5–2 across the supported FFmpeg builds.
    let tempo = 1 / speed;
    const tempos = [];
    while (tempo > 2) { tempos.push("atempo=2"); tempo /= 2; }
    while (tempo < 0.5) { tempos.push("atempo=0.5"); tempo /= 0.5; }
    const audioFilter = hasAudio ? `atrim=duration=${shot.duration},asetpts=PTS-STARTPTS,${[...tempos, `atempo=${tempo}`].join(",")}` : "anull";
    await exec("ffmpeg", ["-nostdin", "-v", "error", "-y", "-filter_threads", "1", ...input, "-map", "0:v:0", "-map", hasAudio ? "0:a:0" : "1:a:0", "-vf", videoFilter, "-af", audioFilter, "-t", String(target), "-c:v", "libx264", "-threads", "2", "-preset", "fast", "-crf", "20", "-maxrate", "8M", "-bufsize", "16M", "-g", "60", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-ac", "2", path], { timeout: 300000 });
    edited.push(path);
  }
  const listPath = `${outputPath}.txt`;
  await writeFile(listPath, edited.map((clip) => `file '${clip.replaceAll("'", "'\\''")}'`).join("\n"));
  await exec("ffmpeg", ["-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listPath, "-t", String(duration), "-c", "copy", "-movflags", "+faststart", outputPath]);
  const final = await probeVideo(outputPath);
  const video = final.streams.find((s) => s.codec_type === "video");
  if (Math.abs(Number(final.format.duration) - duration) > 0.2 || video?.width !== width || video?.height !== height) throw new Error("Final video failed duration/resolution verification.");
}
