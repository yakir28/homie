begin;

with selected_category as (
  select id
  from public.template_categories
  where name in ('Cinematic', 'Casual', 'Featured')
  order by case name when 'Cinematic' then 0 when 'Casual' then 1 else 2 end
  limit 1
)
insert into public.video_templates (
  category_id, name, slug, description, style_label, format, duration_seconds,
  credits_cost, min_photos, max_photos, preview_url, thumbnail_url,
  generation_config, is_featured, is_active, sort_order
)
select
  selected_category.id,
  'Reflection Reveal',
  'reflection-reveal',
  'A cinematic puddle-reflection reveal that resolves into an authentic, continuity-locked walkthrough of the same home.',
  'Cinematic',
  '9:16',
  18,
  60,
  8,
  12,
  '/api/media/template?key=templates/reflection-reveal/preview.mp4',
  '/api/media/template?key=templates/reflection-reveal/thumbnail.jpg',
  jsonb_build_object(
    'version', 7,
    'provider', 'higgsfield',
    'higgsfield_model', 'kling_3_0',
    'higgsfield_resolution', '720p',
    'supports_generate_audio', false,
    'workflow', 'four_paired_handles_reflection_reveal',
    'base_prompt', 'Photorealistic approachable real-estate film of the exact supplied property. Natural overcast daylight, realistic stabilized-camera optics, stable verticals, restrained motion and physically accurate reflections.',
    'preservation_prompt', 'Treat every supplied image as immutable visual ground truth. Lock architecture, roofline, siding, porch, windows, garage, doors, flooring, fireplace, cabinetry, appliances, furniture identity, furniture count, decor positions, landscaping, fences, materials, colors and lighting logic. Keep each source scene unchanged throughout its shot. Transitions must read as clean editorial cuts, never generative room morphs. No geometry drift, new openings, moving furniture, duplicate objects, invented hallways, fake doorway travel, surreal mirror behavior, people, vehicles, text, logos or watermarks.',
    'photo_order', jsonb_build_array('reflection_hook', 'clean_facade', 'entry', 'living_room', 'kitchen', 'dining_room', 'primary_bedroom', 'backyard'),
    'edit', jsonb_build_object(
      'generated_clip_duration', 5,
      'transition', 'clean_editorial_cut_on_matched_motion',
      'speed_ramps', 'editor_only',
      'speed_multiplier', 1.11,
      'final_duration', 18
    ),
    'shots', jsonb_build_array(
      jsonb_build_object(
        'role', 'reflection_to_facade_hook', 'duration', 5, 'start_photo_index', 0, 'end_photo_index', 1,
        'prompt', 'Begin very low beside the wet driveway with the exact house visible upside down in the existing shallow puddle. Perform a restrained three-percent lateral slide across the physically accurate reflection. As the reflected edge fills the frame, make a clean editorial wipe to the separate exact clean-facade view, then continue with a short stabilized push and readable hero hold. Preserve the exact facade, roofline, siding, porch, windows, garage, driveway and landscaping.'
      ),
      jsonb_build_object(
        'role', 'entry_to_living', 'duration', 5, 'start_photo_index', 2, 'end_photo_index', 3,
        'prompt', 'Begin in the exact entry with a restrained human-eye-level push. Transition with a clean architectural-line match cut into the exact living room, followed by a subtle three-percent lateral slide. Never invent a connecting hallway or morph the rooms.'
      ),
      jsonb_build_object(
        'role', 'kitchen_to_dining', 'duration', 5, 'start_photo_index', 4, 'end_photo_index', 5,
        'prompt', 'Begin in the exact kitchen with a restrained eight-degree micro-arc around the fixed island. Transition with a clean cut on matched camera direction into the exact dining room, then perform a slow three-percent push and readable hold. Never morph furniture, cabinetry or architecture.'
      ),
      jsonb_build_object(
        'role', 'bedroom_to_backyard_finale', 'duration', 5, 'start_photo_index', 6, 'end_photo_index', 7,
        'prompt', 'Begin in the exact primary bedroom with a calm three-percent push. Transition with a clean editorial cut into the exact backyard, followed by a gentle three-percent pullback and stable final hold. Preserve all furniture, openings, rear facade, patio, lawn, fence and landscaping.'
      )
    )
  ),
  true,
  true,
  0
from selected_category
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  style_label = excluded.style_label,
  format = excluded.format,
  duration_seconds = excluded.duration_seconds,
  credits_cost = excluded.credits_cost,
  min_photos = excluded.min_photos,
  max_photos = excluded.max_photos,
  preview_url = excluded.preview_url,
  thumbnail_url = excluded.thumbnail_url,
  generation_config = excluded.generation_config,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;
