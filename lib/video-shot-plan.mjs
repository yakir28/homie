import { createPromptFilmShot } from "./real-estate-video-prompt.mjs";

const BASE_PROMPT = "Polished cinematic real-estate walkthrough. Smooth controlled camera movement, stable level horizon, realistic architectural geometry, consistent furniture and openings, natural spatial continuity, balanced light, tack-sharp luxury-listing cinematography.";
const PRESERVATION_PROMPT = "Treat every supplied property image as ground truth. Preserve the exact architecture, room proportions, doors, windows, furniture, materials, landscaping, and lighting. Do not invent rooms, openings, floors, decor, text, people, or structural transitions that are not visible in the references.";

function inferredRole(index, total) {
  if (index === 0) return "exterior arrival or strongest opening view";
  if (index === total - 1) return "hero closing view";
  if (index / total < 0.55) return "main interior living space";
  return "feature room or lifestyle detail";
}

export function makeShotPlan(project, photos, { higgsfieldModel = "seedance_2_0", higgsfieldResolution = "1080p" } = {}) {
  const config = project.template_prompt_snapshot ?? project.video_templates?.generation_config ?? {};
  if (!photos.length || photos.some((photo) => !photo.path)) throw new Error("Property photos are required.");
  if (!Number.isFinite(project.duration_seconds) || project.duration_seconds <= 0) throw new Error("Invalid film duration.");
  if (config.provider && config.provider !== "higgsfield") throw new Error(`Provider ${config.provider} is not connected to this worker.`);
  if (config.workflow === "prompt_property_film") return [createPromptFilmShot(project, photos)];
  if (config.workflow === "single_30s_all_references") {
    const directorPrompt = config.director_prompt
      ?? config.structured_prompt
      ?? config.timed_prompt
      ?? "";
    if (typeof directorPrompt !== "string" || !directorPrompt.trim()) throw new Error("Template is missing its film prompt.");
    return [{
      order: 0,
      role: "complete_property_film",
      duration: Math.min(30, project.duration_seconds),
      prompt: `${config.base_prompt ?? BASE_PROMPT} ${config.preservation_prompt ?? PRESERVATION_PROMPT} ${directorPrompt}`,
      startPath: null,
      endPath: null,
      referencePaths: photos.map((photo) => photo.path),
      provider: "higgsfield",
      model: config.higgsfield_model ?? config.model ?? higgsfieldModel,
      resolution: config.higgsfield_resolution ?? config.resolution ?? higgsfieldResolution,
      mode: config.higgsfield_mode ?? null,
      bitrateMode: config.higgsfield_bitrate_mode ?? null,
      generateAudio: config.supports_generate_audio === false ? false : config.generate_audio ?? false,
    }];
  }
  const configured = Array.isArray(config.shots) ? config.shots : [];
  if (!configured.length) throw new Error("Template is missing its shot prompts.");
  const targetShots = configured.length;
  const configuredTotal = configured.reduce((sum, shot) => sum + Number(shot.duration), 0);
  if (!Number.isFinite(configuredTotal) || configured.some((shot) => Number(shot.duration) <= 0 || Number(shot.duration) > 30)) throw new Error("Invalid template shot duration.");
  if (configured.some((shot) => typeof (shot.prompt ?? shot.motion) !== "string" || !(shot.prompt ?? shot.motion).trim())) throw new Error("Every template shot needs its own prompt.");
  return Array.from({ length: targetShots }, (_, index) => {
    const definition = configured[index] ?? {};
    const isConfiguredShot = true;
    for (const field of ["start_photo_index", "end_photo_index"]) {
      if (definition[field] !== undefined && (!Number.isInteger(definition[field]) || definition[field] < 0)) throw new Error(`Missing photo for template shot ${index + 1}.`);
    }
    const shotSpan = Math.max(1, targetShots - 1);
    const fallbackStartIndex = Math.min(photos.length - 1, Math.round(index * (photos.length - 1) / shotSpan));
    const startIndex = Number.isInteger(definition.start_photo_index)
      ? Math.max(0, Math.min(photos.length - 1, definition.start_photo_index))
      : fallbackStartIndex;
    const hasExplicitEnd = Number.isInteger(definition.end_photo_index);
    const endIndex = hasExplicitEnd
      ? Math.max(0, Math.min(photos.length - 1, definition.end_photo_index))
      : startIndex;
    const midpoint = Math.min(photos.length - 1, Math.round((startIndex + endIndex) / 2));
    const startLabel = photos[startIndex].roomType ?? inferredRole(startIndex, photos.length);
    const endLabel = photos[endIndex].roomType ?? inferredRole(endIndex, photos.length);
    const basePrompt = config.base_prompt ?? BASE_PROMPT;
    const preservationPrompt = config.preservation_prompt ?? PRESERVATION_PROMPT;
    const referenceMode = definition.reference_mode ?? (hasExplicitEnd ? "both" : "start");
    const imageAdaptation = referenceMode === "end"
      ? `The end reference is the ground-truth property reveal. Begin with the described stylized setup, then converge cleanly and exactly on that reference without changing the home's architecture, materials, or surroundings.`
      : referenceMode === "start"
        ? `The start reference is the immutable ground-truth property. Keep that exact property identity, architecture, materials, landscaping, and surroundings throughout the entire shot.`
      : `The start reference shows ${startLabel}; the end reference shows ${endLabel}. Adapt the camera path to only what is visually supported by these images. If they do not show a physically connected space, use a graceful editorial reveal rather than inventing a doorway or passage.`;
    return {
      order: index,
      role: definition.role ?? (index === 0 ? "hook" : index === targetShots - 1 ? "closing" : "interior"),
      duration: Number(definition.duration),
      editDuration: Number(definition.duration) / configuredTotal * project.duration_seconds,
      prompt: `${basePrompt} ${preservationPrompt} ${definition.prompt ?? definition.motion} ${imageAdaptation}`,
      startPath: referenceMode === "end" ? null : photos[startIndex].path,
      endPath: referenceMode === "end"
        ? photos[startIndex].path
        : referenceMode === "start" || !hasExplicitEnd
          ? null
          : photos[endIndex].path,
      referencePaths: ["start", "end"].includes(referenceMode) || !isConfiguredShot
        ? []
        : referenceMode === "both" && midpoint !== startIndex && midpoint !== endIndex ? [photos[midpoint].path] : [],
      provider: "higgsfield",
      model: config.higgsfield_model ?? config.model ?? higgsfieldModel,
      resolution: config.higgsfield_resolution ?? config.resolution ?? higgsfieldResolution,
      generateAudio: config.supports_generate_audio === false
        ? false
        : definition.generate_audio ?? config.generate_audio ?? false,
    };
  });
}


export function buildGenerationCommand(shot, aspectRatio, waitTimeout = "30m") {
  const command = [
    "generate", "create", shot.model,
    "--prompt", shot.prompt,
  ];
  if (shot.startPath) command.push("--start-image", shot.startPath);
  if (shot.endPath) command.push("--end-image", shot.endPath);
  for (const referencePath of shot.referencePaths) command.push("--image", referencePath);
  if (shot.mode) command.push("--mode", shot.mode);
  if (shot.bitrateMode) command.push("--bitrate_mode", shot.bitrateMode);
  command.push(
    "--duration", String(shot.duration),
    "--resolution", shot.resolution,
    "--aspect_ratio", aspectRatio,
    "--wait",
    "--wait-timeout", waitTimeout,
    "--wait-interval", "5s",
    "--json",
  );
  if (shot.generateAudio !== null) {
    command.splice(command.indexOf("--wait"), 0, "--generate_audio", String(shot.generateAudio));
  }
  return command;
}

export function validateShotPlan(shots, aspectRatio) {
  if (!shots.length) throw new Error("Empty shot plan.");
  if (!["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].includes(aspectRatio)) throw new Error("Unsupported aspect ratio.");
  for (const shot of shots) {
    if (!shot.prompt?.trim()) throw new Error("Missing shot prompt.");
    if (!Number.isInteger(shot.duration) || shot.duration < 4 || shot.duration > 30) throw new Error("Unsupported shot duration.");
    const referenceCount = shot.referencePaths.length + Number(Boolean(shot.startPath)) + Number(Boolean(shot.endPath));
    const is25 = shot.model === "seedance_2_5";
    if (!["seedance_2_0", "seedance_2_5"].includes(shot.model)) throw new Error(`Unvalidated video model: ${shot.model}.`);
    if (!referenceCount || referenceCount > (is25 ? 30 : 9)) throw new Error("Too many or missing photo references for the selected model.");
    if (!(is25 ? ["480p", "720p", "1080p"] : ["480p", "720p", "1080p", "4k"]).includes(shot.resolution)) throw new Error(`${shot.model} does not support ${shot.resolution}.`);
    if (is25 && shot.mode !== "omni_reference") throw new Error("Seedance 2.5 property videos require omni_reference mode.");
    if (!is25 && shot.mode && !["std", "fast"].includes(shot.mode)) throw new Error("Unsupported Seedance 2.0 mode.");
    if (shot.mode === "fast" && ["1080p", "4k"].includes(shot.resolution)) throw new Error("Fast mode only supports 480p/720p.");
  }
}
