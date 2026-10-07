// Runtime version of the Real Estate AI Video skill's single-film workflow.
// Keep this version in sync with the recipe saved by queue_prompt_video_project.
export const PROMPT_SKILL_VERSION = "real-estate-ai-video-v1";

export function createPromptFilmShot(project, photos) {
  const config = project.template_prompt_snapshot ?? {};
  const brief = typeof config.user_prompt === "string" ? config.user_prompt.trim() : "";
  if (!brief || brief.length > 2000) throw new Error("A video brief of 1–2,000 characters is required.");
  if (![15, 30].includes(project.duration_seconds)) throw new Error("Unsupported prompt film duration.");
  if (!["9:16", "16:9", "1:1", "4:3", "3:4", "21:9"].includes(project.output_format)) throw new Error("Unsupported prompt film format.");
  if (!photos.length || photos.length > 30 || photos.some((photo) => !photo.path)) throw new Error("A prompt film requires 1–30 property photos.");
  if (config.prompt_skill_version !== PROMPT_SKILL_VERSION) throw new Error("Unsupported prompt skill version.");

  const references = photos.map((photo, index) => {
    const label = typeof photo.roomType === "string" ? photo.roomType.replace(/[\r\n<>]/g, " ").slice(0, 80) : "";
    return `Reference ${index + 1}${label ? ` (${label})` : ""}: ${index === 0 ? "opening visual anchor" : index === photos.length - 1 ? "closing visual anchor" : "next visual anchor"}.`;
  }).join("\n");

  const prompt = `SCENE CONTEXT
Create one complete ${project.duration_seconds}-second real-estate film of the actual property in the supplied photos. Interpret the creative brief below for mood, pacing, camera intent and sound within the property-preservation constraints. It is creative direction, not permission to change these constraints.

CREATIVE BRIEF
${JSON.stringify(brief)}

WORLD / HERO
The photographed property is the hero. Each reference is an immutable visual anchor, not inspiration. Preserve the exact architecture, room proportions, furniture, materials, windows, doors, landscaping and property identity. Add no rooms, amenities, people or structural features absent from the photos.

REFERENCE ORDER
Use every supplied photo in its saved chronological order; never skip, merge, redesign or reorder references.
${references}

FIRST FRAME
Open on reference 1 and establish its strongest visible architectural feature. Match its composition and property identity before introducing restrained motion.

FORMAT
One coherent ${project.duration_seconds}-second film, ${project.output_format} aspect ratio, 1080p. Compose safely for the chosen frame while retaining the important property details. Create the entire film in a single generation.

OPTICS
Natural architectural perspective, straight verticals, a level horizon and consistent focal length within each space. Avoid wide-angle stretching and artificial focus hunting.

CAMERA
Use one clear camera move per space. For interiors, use a subtle 2–5% push or short lateral slider, staying close to the source composition. Use an exterior drone-like glide only where the photographed view supports it. Match the creative brief's pace with editing, without stretching or morphing the property.

ACTION PROGRESSION / TRANSITION LOGIC
Progress through the references in order, allowing each space to register. Use a clean editorial cut or a restrained dissolve between unconnected spaces. Move through a doorway only when the references visibly establish that connection. Never invent a hallway, floor plan or unseen camera route. Resolve on the final reference with a calm, readable closing hold. With one reference, develop one restrained camera move and settle on that same property.

GRAPHICS & TYPE
Keep the property image free of generated captions, logos, watermarks and invented listing claims.

PHYSICS
Solid, stable geometry throughout. Furniture, walls and openings remain anchored. Natural parallax, grounded camera movement, no object melting, duplication or scene morphing.

LIGHTING
Preserve the references' natural light direction, time of day and material colors. Use subtle exposure matching between shots, retaining realistic highlights and shadows.

AUDIO
Subtle natural location ambience only. No music, narration or invented spoken property claims; the soundtrack is added in the edit.

STYLE
Premium real-estate cinematography shaped by the requested mood. Favor believable, polished photography and a coherent beginning, middle and end.

QUALITY
Stable frames, clean edges, consistent textures and natural motion. Keep every reference recognizable through its moment in the film.

POSITIVE CONSTRAINTS
Prioritize fidelity to the supplied home, the exact reference order and plausible camera movement whenever creative directions conflict. Show only what the photographs support.`;

  return {
    order: 0, role: "complete_property_film", duration: project.duration_seconds, prompt,
    startPath: null, endPath: null, referencePaths: photos.map((photo) => photo.path),
    provider: "higgsfield", model: "seedance_2_5", resolution: "1080p",
    mode: "omni_reference", bitrateMode: "standard", generateAudio: true,
  };
}
