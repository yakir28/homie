begin;

with selected_category as (
  select id
  from public.template_categories
  where name in ('Fast-paced', 'Casual', 'Cinematic', 'Featured')
  order by case name when 'Fast-paced' then 0 when 'Casual' then 1 when 'Cinematic' then 2 else 3 end
  limit 1
)
insert into public.video_templates (
  category_id, name, slug, description, style_label, format, duration_seconds,
  credits_cost, min_photos, max_photos, preview_url, thumbnail_url,
  generation_config, is_featured, is_active, sort_order
)
select
  selected_category.id,
  'Pulse Tour',
  'pulse-tour',
  'A rhythmic high-pace property tour built around fast travel, precise braking, readable room reveals, and clean editorial cuts.',
  'Fast-paced',
  '9:16',
  18,
  60,
  8,
  12,
  '/api/media/template?key=templates/pulse-tour/preview.mp4',
  '/api/media/template?key=templates/pulse-tour/thumbnail.jpg',
  jsonb_build_object(
    'version', 6,
    'provider', 'higgsfield',
    'higgsfield_model', 'seedance_2_0_mini',
    'higgsfield_resolution', '720p',
    'supports_generate_audio', false,
    'workflow', 'four_paired_handles_editorial_speed_ramps',
    'base_prompt', 'Photorealistic high-pace real-estate film of the exact supplied property. Fast travel, precise brake, and a readable feature reveal. Natural exposure, stable verticals, realistic 24mm lens behavior and physically filmed drone, gimbal, slider or micro-arc movement.',
    'preservation_prompt', 'Treat every supplied image as immutable visual ground truth. Lock architecture, roofline, walls, doors, windows, flooring, fireplace, cabinetry, appliances, furniture identity, furniture count, object positions, landscaping, fences, neighboring context, materials, colors and lighting logic. Transitions must read as clean editorial cuts, never generative room morphs. No redesigned rooms, geometry drift, new openings, moving furniture, duplicate objects, invented hallways, fake doorway travel, people, text, logos or watermarks.',
    'photo_order', jsonb_build_array('aerial_exterior', 'front_approach', 'living_room', 'kitchen', 'dining_room', 'primary_bedroom', 'backyard', 'closing_aerial'),
    'edit', jsonb_build_object(
      'generated_clip_duration', 5,
      'transition', 'hard_cut_on_matched_direction',
      'speed_ramps', 'editor_only',
      'speed_multiplier', 1.11,
      'minimum_feature_hold_seconds', 0.7,
      'final_duration', 18
    ),
    'shots', jsonb_build_array(
      jsonb_build_object(
        'role', 'aerial_to_front_hook', 'duration', 5, 'start_photo_index', 0, 'end_photo_index', 1,
        'prompt', 'Begin on the exact high three-quarter aerial and perform a controlled drone descent and forward approach. At peak forward motion create a clean editorial transition to the exact ground-level front walkway, followed by a short stabilized push. Stop before the front door fills the frame. Preserve the exact facade, roofline, garage, windows, walkway and landscaping.'
      ),
      jsonb_build_object(
        'role', 'living_to_kitchen', 'duration', 5, 'start_photo_index', 2, 'end_photo_index', 3,
        'prompt', 'Begin in the exact living room with a restrained three-percent push and readable hold. Transition with a clean architectural-line match cut into the exact kitchen, then perform a restrained eight-degree micro-arc around the fixed island. Never invent a connecting room.'
      ),
      jsonb_build_object(
        'role', 'dining_to_bedroom', 'duration', 5, 'start_photo_index', 4, 'end_photo_index', 5,
        'prompt', 'Begin in the exact dining room with a restrained three-percent lateral slider and readable hold. Transition with a clean cut on motion into the exact bedroom, followed by a slow three-percent push and calm hold. Never morph the two rooms.'
      ),
      jsonb_build_object(
        'role', 'backyard_to_aerial_finale', 'duration', 5, 'start_photo_index', 6, 'end_photo_index', 7,
        'prompt', 'Begin behind real foreground foliage in the exact backyard and perform a restrained lateral reveal followed by a small pullback. Transition with a clean editorial cut to the exact closing aerial, then perform a controlled drone pull-up and finish on a stable hold.'
      )
    )
  ),
  true,
  true,
  1
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
