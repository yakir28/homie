import { execFile } from "node:child_process";
import { promisify } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { templateDirections } from "./video-prompts/template-directions.mjs";
import { MUSIC_MOODS } from "./music.mjs";

const exec = promisify(execFile);

export const DIRECTOR_VERSION = "homie-director-v2";
export const DIRECTOR_MODEL = "claude-opus-5-5";
const MIN_SHOT = 4;
const MAX_SHOT = 15;
const MAX_PROMPT = 1400;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    shots: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          role: { type: "string", description: "Short beat name, e.g. 'front door threshold hook'." },
          start_photo: { type: "integer", description: "1-based photo number the shot starts on." },
          end_photo: { type: "integer", description: "1-based photo number the shot ends on, or 0 for a single-photo shot." },
          duration: { type: "integer", description: `Seconds, ${MIN_SHOT}-${MAX_SHOT}.` },
          prompt: { type: "string", description: `Shot direction in English, at most ${MAX_PROMPT} characters.` },
        },
        required: ["role", "start_photo", "end_photo", "duration", "prompt"],
      },
    },
    skipped_photos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { photo: { type: "integer" }, reason: { type: "string" } },
        required: ["photo", "reason"],
      },
    },
    music: {
      type: "object",
      additionalProperties: false,
      properties: {
        use_music: { type: "boolean" },
        mood: { type: "string", enum: MUSIC_MOODS },
        reason: { type: "string" },
      },
      required: ["use_music", "mood", "reason"],
    },
    notes: { type: "string", description: "One or two sentences on how the template was adapted to this home." },
  },
  required: ["shots", "skipped_photos", "music", "notes"],
};

const SYSTEM = `You are Homie's film director. You turn a real estate video template into a concrete shot list for one specific home, using only that home's photos.

How the shot list is used: each shot is rendered separately by an image-to-video model (Kling 3.0) that receives the start photo as the first frame, optionally an end photo as the last frame, and your shot prompt. Shots are then cut together in your order, and music is added in the edit.

Directing rules:
- Keep the template's identity: its signature opening hook, mood, light treatment and camera rhythm. The opening shot performs the hook once.
- Cast photos deliberately. Give each beat the photo that best supports it: the hook needs a photo that physically allows it (a visible front door for a door-opening hook, an aerial or facade for a drone arrival, real glass for a glass reveal). If no photo supports the hook, use the template's own fallback described in its recipe rather than inventing architecture.
- You may skip photos that are blurry, near-duplicates, badly lit, or that do not fit the film. Skipping is better than a weak shot.
- Use an end photo only when both photos show the same space or a physically plausible continuous move between them (e.g. aerial to the same facade, front walkway to that front door). Otherwise use a single-photo shot and let the edit cut.
- Write each prompt about what is actually in that photo: name the concrete subjects, materials and composition you see (e.g. "push slowly toward the black front door between the two brass lanterns"). Describe one camera move, the template effect if this shot carries one, and the composition the shot ends on. Do not refer to "Photo 3"; describe the content.
- Never invent rooms, doors, openings, furniture, views, people, text or amenities. Template effects (weather, light, a temporary reflection or drawing layer) are allowed only as the template recipe describes.
- Do not repeat preservation boilerplate; the system adds it to every shot.
- Order the shots as a natural tour that ends on a calm, strong closing view.
- Background music: the edit can lay one instrumental track under the film; the shots themselves only carry natural ambience. Decide whether this film needs it (most social property films do) and pick the mood that fits the template and this home: ${MUSIC_MOODS.join(", ")}. Choose no music only when the template's identity clearly depends on silence or natural sound.
- Durations are whole seconds between ${MIN_SHOT} and ${MAX_SHOT} and must add up exactly to the requested film length. Short social films usually need 3-5 shots; never more than one shot per 4 seconds.`;

function templateBrief(config, slug) {
  const parts = [`Template: ${config.template_name ?? slug ?? "custom"}`];
  const recipe = config.creative_recipe ?? templateDirections[slug];
  if (recipe) parts.push(`Creative recipe:\nMood: ${recipe.mood}\nOpening hook: ${recipe.opening}\nTreatment: ${recipe.treatment}\nCamera: ${recipe.motion}`);
  if (config.base_prompt) parts.push(`Base style: ${config.base_prompt}`);
  if (Array.isArray(config.shots) && config.shots.length) {
    parts.push(`Original shot list (written for the template's sample home; adapt it, do not copy its photo assumptions):\n${config.shots.map((shot, i) => `${i + 1}. ${shot.role ?? "beat"} (${shot.duration}s): ${shot.prompt ?? shot.motion ?? ""}`).join("\n")}`);
  }
  const script = config.director_prompt ?? config.timed_prompt ?? config.structured_prompt;
  if (typeof script === "string" && script.trim()) parts.push(`Original film script (written for the template's sample home):\n${script.slice(0, 6000)}`);
  return parts.join("\n\n");
}

async function photoBlock(path) {
  const { stdout } = await exec("ffmpeg", ["-nostdin", "-v", "error", "-i", path, "-frames:v", "1", "-vf", "scale='min(1024,iw)':'min(1024,ih)':force_original_aspect_ratio=decrease", "-q:v", "4", "-f", "image2", "-c:v", "mjpeg", "pipe:1"], { encoding: "buffer", maxBuffer: 20 * 1024 * 1024, timeout: 60000 });
  return { type: "image", source: { type: "base64", media_type: "image/jpeg", data: stdout.toString("base64") } };
}

function analysisHint(analysis) {
  if (!analysis) return "";
  const { view, room, label, quality, front_door_visible, glass_prominent, ground_surface_visible, foreground_element } = analysis;
  return ` (pre-scan: ${view}, ${room}, "${label}", quality ${quality}${front_door_visible ? ", front door visible" : ""}${glass_prominent ? ", large glass" : ""}${ground_surface_visible ? ", ground surface" : ""}${foreground_element ? ", foreground element" : ""})`;
}

// Turns the model's plan into the template `shots` format the planners already understand.
export function validateDirectorPlan(plan, { photoCount, duration }) {
  if (!Array.isArray(plan?.shots) || !plan.shots.length) throw new Error("Director returned no shots.");
  if (plan.shots.length > Math.floor(duration / MIN_SHOT)) throw new Error("Director planned too many shots for the film length.");
  const total = plan.shots.reduce((sum, shot) => sum + shot.duration, 0);
  if (total !== duration) throw new Error(`Director shot durations add up to ${total}s, not ${duration}s.`);
  return plan.shots.map((shot) => {
    if (!Number.isInteger(shot.duration) || shot.duration < MIN_SHOT || shot.duration > MAX_SHOT) throw new Error("Director shot duration is out of range.");
    if (!Number.isInteger(shot.start_photo) || shot.start_photo < 1 || shot.start_photo > photoCount) throw new Error("Director picked a photo that does not exist.");
    if (!Number.isInteger(shot.end_photo) || shot.end_photo < 0 || shot.end_photo > photoCount) throw new Error("Director picked an end photo that does not exist.");
    const prompt = String(shot.prompt ?? "").replace(/[<>]/g, " ").trim();
    if (prompt.length < 40) throw new Error("Director shot prompt is too short.");
    return {
      role: String(shot.role ?? "property view").replace(/[\r\n<>]/g, " ").slice(0, 60),
      prompt: prompt.slice(0, MAX_PROMPT),
      duration: shot.duration,
      start_photo_index: shot.start_photo - 1,
      ...(shot.end_photo && shot.end_photo !== shot.start_photo ? { end_photo_index: shot.end_photo - 1 } : {}),
    };
  });
}

export function validateMusicChoice(music) {
  if (typeof music?.use_music !== "boolean" || !MUSIC_MOODS.includes(music.mood)) throw new Error("Director returned an invalid music choice.");
  return { use_music: music.use_music, mood: music.mood, reason: String(music.reason ?? "").slice(0, 300) };
}

export function createDirector({ apiKey = process.env.ANTHROPIC_API_KEY } = {}) {
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });
  return async function direct({ config, slug, photos, duration, aspectRatio }) {
    const content = [{ type: "text", text: `${templateBrief(config, slug)}\n\nFilm: ${duration} seconds, ${aspectRatio}. The home has ${photos.length} photos:` }];
    for (const [i, photo] of photos.entries()) {
      content.push({ type: "text", text: `Photo ${i + 1}${analysisHint(photo.analysis)}` }, await photoBlock(photo.path));
    }
    content.push({ type: "text", text: `Plan the shot list for this home. Durations must add up to exactly ${duration} seconds.` });
    // Refusal fallback lets a declined request rerun on another model instead of failing the render.
    const response = await client.beta.messages.create({
      model: DIRECTOR_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason !== "end_turn") throw new Error(`Director stopped early (${response.stop_reason}).`);
    const plan = JSON.parse(response.content.find((block) => block.type === "text")?.text ?? "null");
    const shots = validateDirectorPlan(plan, { photoCount: photos.length, duration });
    return { version: DIRECTOR_VERSION, model: response.model, photo_count: photos.length, duration, shots, skipped_photos: plan.skipped_photos, music: validateMusicChoice(plan.music), notes: String(plan.notes ?? "").slice(0, 600) };
  };
}
