begin;

-- A template shot owns its scene structure. The worker must not infer a second
-- reference frame unless the recipe explicitly asks for one.
update public.video_templates
set generation_config = jsonb_set(
  generation_config,
  '{shots,0}',
  (generation_config->'shots'->0) || jsonb_build_object(
    'reference_mode', 'start',
    'start_photo_index', 0,
    'scene_lock', true,
    'prompt', 'Reproduce the Magic Build Reveal template composition on the exact supplied property image. Hold one continuous exterior composition. Begin from the existing property or lot exactly as photographed, perform the same clean premium magical-build reveal within that fixed composition, and resolve on a polished finished-property hero frame. Use restrained construction light, material assembly, and subtle particles only. Keep the camera path, reveal beats, scene order, and timing consistent with the template preview. Do not cut to another room, morph into another listing photo, invent a doorway traversal, add people, text, logos, explosions, debris, or change the surrounding lots, roads, vegetation, horizon, or neighboring structures.'
  ),
  true
), updated_at = now()
where slug = 'magic-build-reveal'
  and jsonb_typeof(generation_config->'shots') = 'array'
  and jsonb_array_length(generation_config->'shots') > 0;

commit;
