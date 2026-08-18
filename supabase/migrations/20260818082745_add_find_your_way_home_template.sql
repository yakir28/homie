begin;

with selected_category as (
  select id
  from public.template_categories
  where name in ('Casual', 'Featured', 'Cinematic')
  order by case name when 'Casual' then 0 when 'Featured' then 1 else 2 end
  limit 1
)
insert into public.video_templates (
  category_id, name, slug, description, style_label, format, duration_seconds,
  credits_cost, min_photos, max_photos, preview_url, thumbnail_url,
  generation_config, is_featured, is_active, sort_order
)
select
  selected_category.id,
  'Find Your Way Home',
  'find-your-way-home',
  'An approachable neighborhood-to-backyard tour built from clean, stable single-image shots with authentic interiors.',
  'Casual',
  '9:16',
  18,
  60,
  6,
  12,
  '/api/media/template?key=templates/find-your-way-home/preview.mp4',
  '/api/media/template?key=templates/find-your-way-home/thumbnail.jpg',
  jsonb_build_object(
    'version', 4,
    'provider', 'higgsfield',
    'higgsfield_model', 'seedance_2_0_mini',
    'higgsfield_resolution', '720p',
    'supports_generate_audio', false,
    'workflow', 'single_image_shots_editorial_cuts',
    'base_prompt', 'Photorealistic approachable real-estate film for a modest home. Natural daylight, realistic optics, stable vertical lines, restrained camera motion and warm everyday character rather than luxury styling.',
    'preservation_prompt', 'Animate only the supplied image for each shot. Treat it as immutable visual ground truth. Lock every wall, ceiling, doorway, window, floor, cabinet, appliance, furniture item, exterior feature and landscaping element in its original position from first frame to last. Never transition into another room inside a generated shot. No architectural transformation, invented openings, moving furniture, geometry drift, morphing, redesign, people, text or logos.',
    'edit', jsonb_build_object(
      'generated_clip_duration', 4,
      'use_seconds_per_clip', 3,
      'transition', 'clean_editorial_cut',
      'speed_ramps', 'editor_only',
      'final_duration', 18
    ),
    'shots', jsonb_build_array(
      jsonb_build_object('role', 'neighborhood_hook', 'duration', 4, 'reference_mode', 'start', 'prompt', 'Perform one slow controlled diagonal drone descent toward the featured home with a stable horizon and subtle natural parallax. Preserve every roof, road, tree, property boundary and building.'),
      jsonb_build_object('role', 'facade_arrival', 'duration', 4, 'reference_mode', 'start', 'prompt', 'Perform one subtle forward push toward the existing front entrance, no more than a five-percent camera advance. Preserve the exact facade, roofline, garage, windows, driveway and landscaping.'),
      jsonb_build_object('role', 'living_room', 'duration', 4, 'reference_mode', 'start', 'prompt', 'Perform one very slow four-percent forward camera push at human eye level. Keep the same living room and all furniture perfectly fixed throughout the shot.'),
      jsonb_build_object('role', 'kitchen', 'duration', 4, 'reference_mode', 'start', 'prompt', 'Perform one restrained three-percent lateral camera slide. Lock every cabinet, appliance, countertop, island, fixture, doorway and floorboard in place.'),
      jsonb_build_object('role', 'dining', 'duration', 4, 'reference_mode', 'start', 'prompt', 'Perform one slow subtle push toward the dining table. Preserve the exact table, chair count, windows, sliding doors, walls, floor and exterior view.'),
      jsonb_build_object('role', 'backyard_finale', 'duration', 4, 'reference_mode', 'start', 'prompt', 'Perform one very slow three-percent backward drift and finish on a calm stable hold. Animate only gentle existing foliage and slightly warmer natural light; add nothing to the yard.')
    )
  ),
  true,
  true,
  3
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
