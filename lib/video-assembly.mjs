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

// Lays a soundtrack under the edit: shot ambience stays audible but quiet, and the
// mix is normalized to social-platform loudness.
export async function mixMusic(videoPath, music, outputPath, { duration, ambienceVolume = 0.25 }) {
  const start = Number(music.start ?? 0);
  const fadeOut = Math.min(1.5, duration / 4);
  const filter = [
    `[1:a]atrim=duration=${duration},asetpts=PTS-STARTPTS,afade=t=in:d=0.4,afade=t=out:st=${duration - fadeOut}:d=${fadeOut}[music]`,
    `[0:a]volume=${ambienceVolume}[ambience]`,
    `[ambience][music]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[mix]`,
  ].join(";");
  await exec("ffmpeg", ["-nostdin", "-v", "error", "-y", "-i", videoPath, "-stream_loop", "-1", "-ss", String(start), "-i", music.path, "-filter_complex", filter, "-map", "0:v:0", "-map", "[mix]", "-t", String(duration), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", outputPath], { timeout: 300000 });
}

// Normalize each shot before concatenating so the last scene survives the edit.
// Burned-in Homie logo for first-video ($1 trial) exports. Top-right stays clear of
// the like/comment rail and caption area that social apps draw over vertical video.
export function watermarkFilter(width, height, inputIndex) {
  const shortSide = Math.min(width, height);
  const logoWidth = Math.round(shortSide * 0.3 / 2) * 2;
  const margin = Math.round(shortSide * 0.035);
  return `[${inputIndex}:v]scale=${logoWidth}:-1,format=rgba,colorchannelmixer=aa=0.9[wm];[base][wm]overlay=W-w-${margin}:${margin}:format=auto,format=yuv420p`;
}

export async function assembleVideo(clips, shots, outputPath, { duration, aspectRatio, resolution, music = null, watermark = null }) {
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
    const input = ["-i", clips[i], ...(hasAudio ? [] : ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]), ...(watermark ? ["-i", watermark] : [])];
    const speed = target / shot.duration;
    const videoFilter = `trim=duration=${shot.duration},setpts=${speed}*(PTS-STARTPTS),scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`;
    // atempo accepts 0.5–2 across the supported FFmpeg builds.
    let tempo = 1 / speed;
    const tempos = [];
    while (tempo > 2) { tempos.push("atempo=2"); tempo /= 2; }
    while (tempo < 0.5) { tempos.push("atempo=0.5"); tempo /= 0.5; }
    const audioFilter = hasAudio ? `atrim=duration=${shot.duration},asetpts=PTS-STARTPTS,${[...tempos, `atempo=${tempo}`].join(",")}` : "anull";
    const videoArgs = watermark
      ? ["-filter_complex", `[0:v]${videoFilter}[base];${watermarkFilter(width, height, hasAudio ? 1 : 2)}[v]`, "-map", "[v]"]
      : ["-map", "0:v:0", "-vf", videoFilter];
    await exec("ffmpeg", ["-nostdin", "-v", "error", "-y", "-filter_threads", "1", ...input, ...videoArgs, "-map", hasAudio ? "0:a:0" : "1:a:0", "-af", audioFilter, "-t", String(target), "-c:v", "libx264", "-threads", "2", "-preset", "fast", "-crf", "20", "-maxrate", "8M", "-bufsize", "16M", "-g", "60", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-ac", "2", path], { timeout: 300000 });
    edited.push(path);
  }
  const listPath = `${outputPath}.txt`;
  await writeFile(listPath, edited.map((clip) => `file '${clip.replaceAll("'", "'\\''")}'`).join("\n"));
  const concatPath = music ? `${outputPath}.concat.mp4` : outputPath;
  await exec("ffmpeg", ["-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listPath, "-t", String(duration), "-c", "copy", "-movflags", "+faststart", concatPath]);
  if (music) await mixMusic(concatPath, music, outputPath, { duration });
  const final = await probeVideo(outputPath);
  const video = final.streams.find((s) => s.codec_type === "video");
  if (Math.abs(Number(final.format.duration) - duration) > 0.2 || video?.width !== width || video?.height !== height) throw new Error("Final video failed duration/resolution verification.");
}
