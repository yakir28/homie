import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const MUSIC_MOODS = ["calm", "warm", "cinematic", "modern", "energetic"];

// Default soundtrack mood per template; a template can override with generation_config.music_mood.
export const MOOD_BY_TEMPLATE = {
  "reflection-reveal": "calm",
  "pulse-tour": "energetic",
  "foreground-reveal": "modern",
  "find-your-way-home": "warm",
  "maple-glass-flight": "cinematic",
  "warm-threshold": "warm",
  "city-apartment": "modern",
  "blueprint-to-reality": "cinematic",
  "house-behind-the-glass": "calm",
  "gta-drop": "energetic",
};

export async function loadMusicLibrary(url = new URL("./music-library.json", import.meta.url)) {
  const { tracks } = JSON.parse(await readFile(url, "utf8"));
  for (const track of tracks) {
    if (!track.id || !track.file || !Array.isArray(track.moods) || !track.moods.length) throw new Error(`Invalid music track: ${JSON.stringify(track)}`);
    if (!track.license) throw new Error(`Music track ${track.id} has no license recorded.`);
    if (track.moods.some((mood) => !MUSIC_MOODS.includes(mood))) throw new Error(`Music track ${track.id} has an unknown mood.`);
  }
  return tracks;
}

export function musicMoodFor(project) {
  const config = project.template_prompt_snapshot ?? project.video_templates?.generation_config ?? {};
  if (config.music === false) return null;
  return config.music_mood ?? MOOD_BY_TEMPLATE[project.video_templates?.slug] ?? "warm";
}

// Deterministic per project so a resumed render keeps the same soundtrack.
export function pickMusicTrack(project, tracks, duration = project.duration_seconds) {
  const config = project.template_prompt_snapshot ?? project.video_templates?.generation_config ?? {};
  if (config.music === false || !tracks.length) return null;
  if (config.music_track) {
    const pinned = tracks.find((track) => track.id === config.music_track);
    if (!pinned) throw new Error(`Template music track ${config.music_track} is not in the library.`);
    return pinned;
  }
  const mood = musicMoodFor(project);
  const matching = tracks.filter((track) => track.moods.includes(mood));
  const candidates = matching.length ? matching : tracks;
  const longEnough = candidates.filter((track) => !track.duration || track.duration - (track.start ?? 0) >= duration);
  const pool = longEnough.length ? longEnough : candidates;
  const hash = createHash("sha256").update(String(project.id)).digest().readUInt32BE(0);
  return pool[hash % pool.length];
}
