// Explicit adaptations keep the gallery's creative identities inside Kling's
// 3072-character prompt limit. Long single-film scripts cannot be sent unchanged.
const DIRECTIONS = {
  "maple-glass-flight": "Maple Glass Flight: controlled elevated exterior approach, then precise gimbal motion through verified interior anchors, ending with a calm outdoor hold. Keep forward visual momentum, use natural architectural occlusions at edits, and never invent a connecting corridor.",
  "warm-threshold": "Warm Threshold: an inviting approach toward the real home, a welcoming front-door threshold, gentle entry glide, restrained living-room slider and kitchen arc, calm bedroom push, and outdoor pullback. Keep warm natural light and attainable styling; only use openings present in the image.",
  "city-apartment": "City Apartment: an urban architectural journey from the actual building and lobby to the apartment and its city view. Use controlled vertical exterior movement, restrained interior sliders, a shallow kitchen arc, calm bedroom push and balcony hold. Never invent an elevator journey or unseen hallway.",
  "blueprint-to-reality": "Blueprint to Reality: the supplied home's exact geometry is the design. Opening shot: begin on deep blueprint paper with fine white and chartreuse drafting lines; plot the referenced elevation, then progressively materialize that exact facade. Middle shots: reveal each verified room with subtle aligned architectural proof lines settling into its real materials. Closing shot: all surfaces are fully real; finish with a calm pullback and brief proof lines aligned to existing edges. Never invent geometry. No readable labels or dimension numbers.",
  "house-behind-the-glass": "The House Behind the Glass: discover the exact property through real reflections, window mullions and architectural frames. Use shallow lateral drift so plausible reflections reveal the room; hide edits behind an existing frame edge. Preserve rigid glass and straight mullions. Where no glass is visible, use a restrained slider and an existing doorway edge. Cool exterior reflections coexist with warm practical light. No fantasy portals, moving furniture or camera passage through solid glass.",
};
export const KLING_PLANNER_VERSION = "kling-photo-shots-v1";
export const KLING_CONSTRAINTS = "Treat the supplied photographs as immutable ground truth. Preserve the exact architecture, openings, dimensions, furniture, materials, landscaping and neighborhood. Straight verticals and level horizon. No invented rooms, passages, amenities, people, text, logos or watermarks; no room morphs or geometry drift.";
export function makeKlingShotPlan(project, photos) {
  const config = project.template_prompt_snapshot ?? {};
  const resolution = config.kling_resolution ?? config.higgsfield_resolution ?? "1080p";
  if (!["720p", "1080p", "4k"].includes(resolution)) throw new Error("Kling supports 720p, 1080p or 4k; choose a supported resolution.");
  if (!photos.length || photos.some((p) => !p.path)) throw new Error("Kling requires property photos.");
  if (!["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].includes(project.output_format)) throw new Error("Unsupported output format.");
  const duration = project.duration_seconds;
  if (!Number.isInteger(duration) || duration < 3 || duration > 30) throw new Error("Unsupported film duration.");
  const definitions = config.shots;
  let pieces;
  if (Array.isArray(definitions) && definitions.length) {
    pieces = definitions.map((shot, index) => {
      const last = photos.length - 1;
      const start = Math.min(last, shot.start_photo_index ?? Math.round(index * last / Math.max(1, definitions.length - 1)));
      const end = shot.end_photo_index === undefined || Math.min(last, shot.end_photo_index) === start ? undefined : Math.min(last, shot.end_photo_index);
      if (!photos[start] || (end !== undefined && !photos[end])) throw new Error("A template reference photo is missing.");
      if (shot.reference_mode === "end") throw new Error("This template needs an opening image adaptation before Kling can render it.");
      if (!shot.prompt?.trim()) throw new Error("Template shot prompt is missing.");
      return { role: shot.role, direction: `${config.base_prompt ?? ""}\n${shot.prompt}`, startPath: photos[start].path, endPath: end !== undefined && shot.reference_mode !== "start" ? photos[end].path : null, duration: Number(shot.duration) };
    });
    // A director plan already chose which photos to use and in what order.
    if (!config.director_plan_applied) {
      const used = new Set(pieces.flatMap((piece) => [piece.startPath, piece.endPath]).filter(Boolean));
      for (const photo of photos) {
        if (!used.has(photo.path)) pieces.push({ role: "additional property detail", direction: `${config.base_prompt ?? "Photorealistic property tour."} Use one restrained slider move and preserve the template's mood.`, startPath: photo.path, endPath: null, duration: 3 });
      }
      pieces.sort((a, b) => photos.findIndex((p) => p.path === a.startPath) - photos.findIndex((p) => p.path === b.startPath));
    }
  } else {
    const custom = config.workflow === "prompt_property_film";
    const slug = config.template_slug ?? project.video_templates?.slug;
    const direction = custom ? config.user_prompt?.trim() : DIRECTIONS[slug];
    if (!direction) throw new Error("No Kling adaptation exists for this template.");
    if (photos.length > 30) throw new Error("A film supports up to 30 photos.");
    // Reuse one photo across shots only when needed to respect the 15-second cap.
    const count = Math.max(photos.length, Math.ceil(duration / 15));
    pieces = Array.from({ length: count }, (_, i) => ({
      role: i === 0 ? "opening" : i === count - 1 ? "closing" : "interior",
      direction: custom ? `User creative brief (mood/camera direction only): ${JSON.stringify(direction)}` : direction,
      startPath: photos[Math.min(i, photos.length - 1)].path, endPath: null,
      duration: Math.max(3, Math.floor(duration / count) + (i < duration % count ? 1 : 0)),
    }));
  }
  const total = pieces.reduce((sum, shot) => sum + shot.duration, 0);
  return pieces.map((piece, order) => {
    if (!Number.isInteger(piece.duration) || piece.duration < 3 || piece.duration > 15) throw new Error("Kling shots must last 3–15 seconds.");
    const prompt = `${piece.direction}\n\n${KLING_CONSTRAINTS}\n\nThis is shot ${order + 1} of ${pieces.length}: ${piece.role ?? "property view"}. Generate only this ${piece.duration}-second shot. Use only the supplied ${piece.endPath ? "first and last frames; preserve both anchors" : "photo; keep the same scene throughout"}. ${piece.endPath ? "Use a clean editorial transition when spaces are not physically connected." : "One restrained camera move; do not show another room."} ${order === pieces.length - 1 ? "End on a stable readable hold." : "Maintain a clean composition for the next edit."}`;
    if (prompt.length > 3072) throw new Error("The shot prompt exceeds Kling's 3072-character limit; shorten the creative brief.");
    const generateAudio = config.supports_generate_audio === false ? false : Boolean(config.generate_audio);
    return { ...piece, order, prompt, provider: "kling", model: "kling-3.0", resolution, referencePaths: [], generateAudio, editDuration: piece.duration / total * duration, plannerVersion: KLING_PLANNER_VERSION };
  });
}

export function klingRequest(shot, firstFrame, lastFrame) {
  if (!firstFrame) throw new Error("A first-frame image is required.");
  return { contents: [{ type: "prompt", text: shot.prompt }, { type: "first_frame", url: firstFrame }, ...(lastFrame ? [{ type: "last_frame", url: lastFrame }] : [])], settings: { resolution: shot.resolution, duration: shot.duration, audio: shot.generateAudio ? "native" : "off", multi_shot: Boolean(lastFrame) } };
}
