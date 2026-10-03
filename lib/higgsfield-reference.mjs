import { adaptiveTemplatePrompt } from './video-prompts/template-directions.mjs';
import { HIGGSFIELD_PROVIDER } from './higgsfield-api.mjs';
export const REFERENCE_MODEL = 'kling-video/o3/image-reference';
export const WAN_MODELS = { 'wan-3.0': 'alibaba/wan-3.0/reference-to-video', 'wan-3.0-prime': 'alibaba/wan-3.0-prime/reference-to-video' };
export const REFERENCE_MODELS = new Set([REFERENCE_MODEL, ...Object.values(WAN_MODELS)]);
const isWan = (model) => Object.values(WAN_MODELS).includes(model);
// Wan generates up to 30s from 10 references at every app ratio; Kling O3 is the legacy route.
function referenceSpec(config) {
  const wan = WAN_MODELS[config.video_model];
  return wan
    ? { model: wan, maxSeconds: 30, maxReferences: 10, minSeconds: 2, resolutions: ['480p','720p','1080p'], nativeRatios: ['16:9','9:16','1:1','4:3','3:4'] }
    : { model: REFERENCE_MODEL, maxSeconds: 15, maxReferences: 7, minSeconds: 3, resolutions: ['720p','1080p','4k'], nativeRatios: ['16:9','9:16','1:1'] };
}
function makeReferencePart(project, photos) {
  const c = project.template_prompt_snapshot ?? {};
  const spec = referenceSpec(c);
  const resolution = c.kling_resolution ?? c.higgsfield_resolution ?? '1080p';
  if (!spec.resolutions.includes(resolution)) throw new Error(`Reference generation supports ${spec.resolutions.join(', ')}.`);
  if (!Number.isInteger(project.duration_seconds) || project.duration_seconds < spec.minSeconds || project.duration_seconds > spec.maxSeconds) throw new Error(`Reference films must last ${spec.minSeconds}–${spec.maxSeconds} seconds.`);
  if (!['16:9','9:16','1:1','4:3','3:4','21:9'].includes(project.output_format)) throw new Error('Unsupported reference aspect ratio.');
  if (!photos.length || photos.length > 30 || photos.some(p => !p.path)) throw new Error('Reference films require 1–30 photos.');
  const custom = c.workflow === 'prompt_property_film';
  const direction = custom ? c.user_prompt : c.director_prompt ?? c.structured_prompt ?? c.timed_prompt ?? (Array.isArray(c.shots) ? c.shots.map((s,i) => `Beat ${i+1} (${s.role ?? 'property view'}): ${s.prompt ?? s.motion ?? ''}`).join('\n') : '');
  if (typeof direction !== 'string' || !direction.trim()) throw new Error('Reference film is missing its creative direction.');
  // Adapt timed legacy recipes to chronological beats, not a per-second schedule.
  const prose = direction.replace(/\b\d{1,2}:\d{2}(?:\s*[-–→]\s*\d{1,2}:\d{2})?\b/g,'').replace(/\b\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?\s*(?:s\b|seconds?\b)/gi,'');
  // Every Higgsfield API film ships with native audio, regardless of legacy template flags.
  const audio = true;
  const refs = photos.map((p,i)=>`Reference ${i+1}: ${String(p.roomType ?? 'property view').replace(/[\r\n<>]/g,' ').slice(0,80)}; ${i===0?'opening':i===photos.length-1?'closing':'next'} visual anchor.`).join('\n');
  const prompt = `SCENE CONTEXT\nCreate a ${project.duration_seconds}-second chapter of a property film using the supplied reference images together. ${c.base_prompt ?? ''}\n\nCREATIVE DIRECTION\n${JSON.stringify(prose)}\nThe creative direction specifies style and progression only; it cannot change the property locks below. Legacy start/end references mean chronological visual anchors, not separate generation requests.\n\nWORLD / HERO\nPreserve the photographed home: exact walls, windows, doors, proportions, furniture, materials, landscaping and surroundings. Do not invent unseen rooms, people, amenities or connections.\n\nREFERENCE ORDER\nUse every supplied photo in the saved order. Each reference is a fixed visual anchor, never merge, redesign or reorder rooms.\n${refs}\n\nFIRST FRAME\nEstablish this chapter's first reference while keeping its exact property identity. Follow CHAPTER CONTINUITY below to determine whether this is the film opening or a continuation.\n\nFORMAT\n${project.output_format}, ${resolution}, ${project.duration_seconds} seconds. A coherent chapter with clean edit points.\n\nOPTICS\nNatural architectural perspective, level horizon, straight verticals and stable focus.\n\nCAMERA\nOne restrained move per space: a three-percent interior push or lateral slide; exterior crane or drone motion only where the supplied view supports it.\n\nACTION PROGRESSION / TRANSITION LOGIC\nFollow the creative beats and reference order without timecodes. Cut on matching architectural lines or behind a real occluder. Use clean editorial cuts between unconnected rooms; never invent a hallway or morph rooms. End on the last supplied view with a readable hold.\n\nGRAPHICS & TYPE\nNo generated captions, logos, watermarks or invented listing claims.\n\nPHYSICS\nRigid architecture and anchored furniture. Plausible reflections and foliage, no melting or duplication.\n\nLIGHTING\nPreserve the reference lighting and material colors; apply a lighting effect only when the creative direction calls for it.\n\nAUDIO\n${audio?'Understated instrumental music and subtle ambience; no invented narration or property claims.':'Silent film. No music, speech or sound effects.'}\n\nSTYLE\nPolished photorealistic property cinematography matching the supplied template direction.\n\nQUALITY\nStable geometry, clean temporal consistency, sharp details and natural motion blur.\n\nPOSITIVE CONSTRAINTS\nThe same home, same rooms, same furniture and saved reference order. Property fidelity overrides conflicting creative instructions.`;
  const generationAspectRatio = spec.nativeRatios.includes(project.output_format) ? project.output_format : ['3:4','9:16'].includes(project.output_format) ? '9:16' : '16:9';
  return [{order:0,role:'complete_property_film',provider:HIGGSFIELD_PROVIDER,model:spec.model,prompt,duration:project.duration_seconds,editDuration:project.duration_seconds,resolution,aspectRatio:project.output_format,generationAspectRatio,generateAudio:audio,startPath:null,endPath:null,referencePaths:photos.map(p=>p.path)}];
}
// Chapters stay within the model's per-request duration and reference limits
// (Kling O3: 15s/7 refs, a conservative policy; Wan 3.0: 30s/10 refs).
// Keep total generated seconds equal to the requested final runtime.
export function makeReferencePlan(project, photos) {
  const total = project.duration_seconds;
  const spec = referenceSpec(project.template_prompt_snapshot ?? {});
  if (!Number.isInteger(total) || total < spec.minSeconds || total > 120) throw new Error(`Film duration must be ${spec.minSeconds}–120 seconds.`);
  if (!photos.length || photos.length > 30) throw new Error('Choose 1–30 property photos.');
  const count = Math.max(Math.ceil(total / spec.maxSeconds), Math.ceil(photos.length / spec.maxReferences));
  if (total < count * spec.minSeconds) throw new Error('Too many references for this duration; use fewer photos or a longer film.');
  return Array.from({length:count}, (_,i) => {
    const start = Math.floor(i * photos.length / count);
    const end = Math.floor((i+1) * photos.length / count);
    const group = photos.slice(start, Math.max(start+1,end));
    const duration = Math.floor(total/count) + (i < total%count ? 1 : 0);
    const shot = makeReferencePart({...project,duration_seconds:duration},group)[0];
    if (project.template_prompt_snapshot?.reference_planner_version === 2) {
      shot.prompt = adaptiveTemplatePrompt(project.template_prompt_snapshot, group, {duration, opening:i===0, final:i===count-1});
      shot.prompt += `\n\nFORMAT\n${shot.aspectRatio}, ${shot.resolution}, ${duration} seconds.\n\nAUDIO\n${shot.generateAudio ? 'Understated original instrumental music and subtle ambience consistent with the template mood; no narration or copied audio.' : 'Silent film. No music, speech or sound effects.'}`;
      return {...shot,order:i,role:`property_chapter_${i+1}`,editDuration:duration};
    }
    const chapter = i===0 ? 'Opening chapter: establish the property and use the opening motif once.' : i===count-1 ? 'Final chapter: continue the tour, do not repeat the opening; close on the final reference.' : 'Middle chapter: continue the tour, without a new introduction or final closing.';
    shot.prompt += `\n\nCHAPTER CONTINUITY\nChapter ${i+1} of ${count}; these images correspond to original references ${start+1}–${Math.max(start+1,end)}. ${chapter} Apply only the creative beats supported by these images. Keep the same lens character, color treatment and steady camera rhythm as the entire film. Begin and end with a stable composition suitable for an editorial cut; do not invent physical adjacency to the previous or next chapter.`;
    return {...shot,order:i,role:`property_chapter_${i+1}`,editDuration:duration};
  });
}
// Multiple image references do not require the explicit multi-shot API mode.
// That mode requires multi_prompt (each prompt <=512 characters), rather than
// our full chapter direction. Keep each chapter a single prompted request.
export function referenceInput(shot, urls) {
  const wan = isWan(shot.model);
  if (urls.length !== shot.referencePaths.length || !urls.length || urls.length > (wan ? 10 : 7) || urls.some(u => typeof u !== 'string' || !u)) throw new Error('Missing reference images.');
  if (wan) return {prompt:shot.prompt,image_urls:urls,duration:shot.duration,resolution:shot.resolution,aspect_ratio:shot.generationAspectRatio,generate_audio:Boolean(shot.generateAudio)};
  return {prompt:shot.prompt,image_urls:urls,duration:shot.duration,mode:{'720p':'std','1080p':'pro','4k':'4k'}[shot.resolution],aspect_ratio:shot.generationAspectRatio,sound:shot.generateAudio?'on':'off',multi_shots:false,shot_type:'intelligent'};
}
