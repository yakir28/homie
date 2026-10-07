import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import Anthropic from "@anthropic-ai/sdk";

const exec = promisify(execFile);

export const PHOTO_ANALYSIS_VERSION = "photo-analysis-v1";
export const PHOTO_ANALYSIS_MODEL = "claude-haiku-4-5";

const VIEWS = ["aerial", "exterior_front", "exterior_rear", "exterior_other", "interior"];
const ROOMS = ["none", "entry", "living", "family", "kitchen", "dining", "office", "bedroom", "bathroom", "laundry", "hallway", "garage", "balcony", "backyard", "pool", "view", "other"];
const QUALITY = ["low", "ok", "good", "excellent"];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    view: { type: "string", enum: VIEWS },
    room: { type: "string", enum: ROOMS },
    label: { type: "string", description: "Short factual label, max 8 words, e.g. 'Two-storey front facade with garage'." },
    front_door_visible: { type: "boolean" },
    glass_prominent: { type: "boolean", description: "Large windows, glass doors or a window wall are a dominant part of the frame." },
    ground_surface_visible: { type: "boolean", description: "Outdoor paving, driveway, deck or lawn is visible in the foreground." },
    foreground_element: { type: "boolean", description: "A plant, column, frame or similar object sits close to the camera at a frame edge." },
    straight_on_facade: { type: "boolean", description: "An exterior shot taken roughly square to the facade." },
    quality: { type: "string", enum: QUALITY, description: "Photographic quality: sharpness, exposure, composition." },
  },
  required: ["view", "room", "label", "front_door_visible", "glass_prominent", "ground_surface_visible", "foreground_element", "straight_on_facade", "quality"],
};

const SYSTEM = `You classify real estate photos for an automated property-video editor. Report only what is clearly visible. Use view "aerial" only for drone or elevated overhead shots. For exterior views use room "none" unless the photo is mainly a backyard, pool, balcony or view. The label is a plain factual description, never marketing copy.`;

async function downscale(path) {
  const { stdout } = await exec("ffmpeg", ["-nostdin", "-v", "error", "-i", path, "-frames:v", "1", "-vf", "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease", "-q:v", "4", "-f", "image2", "-c:v", "mjpeg", "pipe:1"], { encoding: "buffer", maxBuffer: 20 * 1024 * 1024, timeout: 60000 });
  return stdout.toString("base64");
}

export function validAnalysis(value) {
  return value?.version === PHOTO_ANALYSIS_VERSION && VIEWS.includes(value.view) && ROOMS.includes(value.room) && QUALITY.includes(value.quality);
}

export async function analyzePhoto(client, path) {
  const response = await client.messages.create({
    model: PHOTO_ANALYSIS_MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: await downscale(path) } },
        { type: "text", text: "Classify this property photo." },
      ],
    }],
  });
  if (response.stop_reason !== "end_turn") throw new Error(`Photo analysis stopped early (${response.stop_reason}).`);
  const text = response.content.find((block) => block.type === "text")?.text;
  const analysis = { ...JSON.parse(text), version: PHOTO_ANALYSIS_VERSION, model: PHOTO_ANALYSIS_MODEL };
  if (!validAnalysis(analysis)) throw new Error("Photo analysis returned an invalid result.");
  analysis.label = analysis.label.replace(/[\r\n<>]/g, " ").trim().slice(0, 60);
  return analysis;
}

export function createPhotoAnalyzer({ apiKey = process.env.ANTHROPIC_API_KEY } = {}) {
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });
  return (path) => analyzePhoto(client, path);
}

// Signature-hook needs per template: higher score = better opening photo.
const OPENING_WEIGHTS = {
  "warm-threshold": { exterior_front: 4, front_door_visible: 6 },
  "reflection-reveal": { exterior_front: 4, ground_surface_visible: 5, straight_on_facade: 2 },
  "house-behind-the-glass": { glass_prominent: 6, exterior_front: 2 },
  "blueprint-to-reality": { exterior_front: 5, straight_on_facade: 4 },
  "foreground-reveal": { foreground_element: 5, exterior_front: 3 },
  "city-apartment": { exterior_front: 4, exterior_other: 2, straight_on_facade: 2 },
  "gta-drop": { aerial: 7, exterior_front: 4 },
  "pulse-tour": { aerial: 5, exterior_front: 4 },
  "find-your-way-home": { aerial: 5, exterior_front: 5 },
  "maple-glass-flight": { aerial: 4, exterior_front: 5 },
};
const DEFAULT_OPENING = { aerial: 3, exterior_front: 5 };
const QUALITY_SCORE = { low: -4, ok: 0, good: 1, excellent: 2 };
const TOUR_ORDER = ["entry", "living", "family", "kitchen", "dining", "office", "bedroom", "bathroom", "hallway", "laundry", "other", "garage", "balcony", "view", "backyard", "pool"];

function openingScore(analysis, weights) {
  if (!analysis) return -Infinity;
  let score = QUALITY_SCORE[analysis.quality] + (weights[analysis.view] ?? 0);
  for (const [feature, weight] of Object.entries(weights)) if (analysis[feature] === true) score += weight;
  return score;
}

function tourRank(analysis) {
  if (!analysis) return 50;
  if (analysis.view === "aerial") return 0;
  if (analysis.view === "exterior_front") return 1;
  if (analysis.view === "interior") return 10 + Math.max(0, TOUR_ORDER.indexOf(analysis.room));
  return 30 + Math.max(0, TOUR_ORDER.indexOf(analysis.room));
}

// Reorders photos so the template's signature hook gets a photo that supports it, then
// walks the home in a natural order. Every planner maps shots onto photo order.
export function castPhotos(photos, templateSlug) {
  if (!photos.some((photo) => photo.analysis)) return photos;
  const weights = OPENING_WEIGHTS[templateSlug] ?? DEFAULT_OPENING;
  const opener = photos.reduce((best, photo) => openingScore(photo.analysis, weights) > openingScore(best.analysis, weights) ? photo : best);
  const rest = photos.filter((photo) => photo !== opener)
    .map((photo, index) => ({ photo, index }))
    .sort((a, b) => tourRank(a.photo.analysis) - tourRank(b.photo.analysis) || QUALITY_SCORE[b.photo.analysis?.quality] - QUALITY_SCORE[a.photo.analysis?.quality] || a.index - b.index)
    .map(({ photo }) => photo);
  return [opener, ...rest];
}

// A verified, prompt-safe label for planners that read photo.roomType.
export function photoLabel(roomType, analysis) {
  if (!analysis) return roomType ?? null;
  const facts = [
    analysis.front_door_visible && "front door visible",
    analysis.glass_prominent && "large glass",
    analysis.view !== "interior" && analysis.ground_surface_visible && "ground surface in foreground",
  ].filter(Boolean);
  return [roomType || analysis.label, ...facts].join("; ").replace(/[\r\n<>]/g, " ").slice(0, 80);
}
