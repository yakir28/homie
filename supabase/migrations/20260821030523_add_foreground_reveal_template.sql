begin;

with selected_category as (
  select id
  from public.template_categories
  where name in ('Casual', 'Cinematic', 'Featured')
  order by case name when 'Casual' then 0 when 'Cinematic' then 1 else 2 end
  limit 1
)
insert into public.video_templates (
  category_id, name, slug, description, style_label, format, duration_seconds,
  credits_cost, min_photos, max_photos, preview_url, thumbnail_url,
  generation_config, is_featured, is_active, sort_order
)
select
  selected_category.id,
  'Hidden in Plain Sight',
  'foreground-reveal',
  'A cinematic foreground reveal that slides past real landscaping before settling into an authentic, continuity-safe home tour.',
  'Casual',
  '9:16',
  18,
  60,
  6,
  12,
  '/templates/foreground-reveal/preview.mp4',
  '/templates/foreground-reveal/poster.jpg',
  jsonb_build_object(
    'version', 5,
    'provider', 'higgsfield',
    'higgsfield_model', 'seedance_2_0_mini',
    'higgsfield_resolution', '720p',
    'supports_generate_audio', false,
    'workflow', 'foreground_reveal_then_single_image_shots',
    'base_prompt', 'Photorealistic approachable real-estate film for the exact supplied property. Natural daylight, realistic stabilized-camera optics, stable verticals, restrained motion and authentic everyday character.',
    'preservation_prompt', 'Treat each supplied image as immutable visual ground truth. Lock every wall, ceiling, doorway, window, floor, cabinet, appliance, furniture item, exterior feature and landscaping element in its original position from first frame to last. Keep the exact same scene throughout each shot. Never invent the next room or pass through unseen geometry. No architectural transformation, moving furniture, object changes, geometry drift, morphing, redesign, people, text or logos.',
    'photo_order', jsonb_build_array('facade_with_foreground', 'entry', 'living_room', 'kitchen', 'dining_room', 'backyard'),
    'edit', jsonb_build_object(
      'generated_clip_duration', 4,
      'use_seconds_per_clip', 3,
      'transition', 'clean_editorial_cut',
      'hook_speed_ramp', jsonb_build_object('editor_only', true, 'ease_in_seconds', 0.6, 'middle_speed', 1.5, 'hero_hold_seconds', 1.2),
      'final_duration', 18
    ),
    'shots', jsonb_build_array(
      jsonb_build_object(
        'role', 'foreground_reveal_hook',
        'duration', 4,
        'reference_mode', 'start',
        'prompt', 'Use an existing tree trunk, hedge, mailbox, porch column or other real foreground object already visible near an edge of the supplied facade photo. Perform one controlled lateral slider reveal with realistic foreground parallax, gradually exposing the exact complete facade, then settle into a stable centered hero composition. If no suitable foreground object exists, use a restrained three-percent lateral slide without inventing one. Preserve the exact roofline, siding, garage, front door, porch, windows, driveway, walkway, lawn, landscaping, neighboring edges, materials, colors and shadows.'
      ),
      jsonb_build_object('role', 'entry', 'duration', 4, 'reference_mode', 'start', 'prompt', 'Perform one slow three-percent forward push at human eye level. Lock the exact entry, door, console, mirror, stairs, railing, rug, walls, openings and visible furniture. Stop before entering another room.'),
      jsonb_build_object('role', 'living_room', 'duration', 4, 'reference_mode', 'start', 'prompt', 'Perform one restrained three-percent lateral slider move with subtle natural parallax. Lock the exact sofa, chairs, tables, rug, lighting, artwork, windows, doors, walls and floor.'),
      jsonb_build_object('role', 'kitchen', 'duration', 4, 'reference_mode', 'start', 'prompt', 'Perform one smooth eight-degree micro-arc around the existing island or primary counter. Lock every cabinet, appliance, countertop, fixture, stool, doorway and floorboard in place.'),
      jsonb_build_object('role', 'dining_room', 'duration', 4, 'reference_mode', 'start', 'prompt', 'Perform one subtle three-percent pedestal rise toward the existing dining table. Preserve the exact table, chair count, pendant, decor, windows, doors, walls and floor.'),
      jsonb_build_object('role', 'backyard_finale', 'duration', 4, 'reference_mode', 'start', 'prompt', 'Perform one gentle three-percent pullback and finish on a stable composed hold. Preserve the exact rear facade, patio, furniture, lawn, fence, trees and shrubs. Animate only subtle existing foliage in a light breeze.')
    )
  ),
  true,
  true,
  2
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
