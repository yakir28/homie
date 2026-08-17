begin;

with selected_category as (
  select id from public.template_categories
  where name in ('Cinematic', 'Luxury', 'Featured')
  order by case name when 'Cinematic' then 0 when 'Luxury' then 1 else 2 end
  limit 1
)
insert into public.video_templates (
  category_id, name, slug, description, style_label, format, duration_seconds,
  credits_cost, min_photos, max_photos, preview_url, thumbnail_url,
  generation_config, is_featured, is_active, sort_order
)
select
  selected_category.id,
  'Golden Hour Estate',
  'golden-hour-estate',
  'A warm, architectural property tour that moves from an elevated arrival through refined interiors to a sunset terrace finale.',
  'Cinematic',
  '9:16',
  25,
  30,
  5,
  12,
  '/api/media/template?key=templates/golden-hour-estate/preview.mp4',
  '/api/media/template?key=templates/golden-hour-estate/thumbnail.jpg',
  jsonb_build_object(
    'version', 3,
    'provider', 'runway',
    'runway_model', 'gen4.5',
    'runway_resolution', '720p',
    'supports_generate_audio', false,
    'base_prompt', 'Premium golden-hour real-estate film. Warm natural light, elegant editorial pacing, restrained stabilized camera motion, realistic optics, clean luxury-listing cinematography.',
    'preservation_prompt', 'The supplied property photograph is immutable visual ground truth. Preserve the exact architecture, proportions, windows, doors, railings, furniture, artwork, landscaping, pool, terrain, materials and lighting direction. Do not add people, text, logos, watermarks, rooms, openings, furniture or structural details.',
    'shots', jsonb_build_array(
      jsonb_build_object('role', 'aerial_arrival', 'duration', 5, 'reference_mode', 'start', 'prompt', 'Locked stabilized aerial view with a restrained two-percent push toward the featured estate. Keep every building and terrain feature fixed.'),
      jsonb_build_object('role', 'pool_hero', 'duration', 5, 'reference_mode', 'start', 'prompt', 'Locked symmetrical facade composition with a restrained two-percent push. Preserve the exact house and pool; animate only gentle water ripples.'),
      jsonb_build_object('role', 'living_room', 'duration', 5, 'reference_mode', 'start', 'prompt', 'Locked architectural composition with a restrained two-percent push toward the fireplace. Keep all furniture, edges and room geometry perfectly fixed.'),
      jsonb_build_object('role', 'architectural_detail', 'duration', 5, 'reference_mode', 'start', 'prompt', 'Locked view of the staircase and chandelier with an extremely subtle upward drift. Preserve every railing line, step and fixture without deformation.'),
      jsonb_build_object('role', 'sunset_finale', 'duration', 5, 'reference_mode', 'start', 'prompt', 'Locked terrace hero composition with a restrained two-percent lateral drift. Animate only the existing flame, subtle foliage and faint pool ripples.')
    )
  ),
  true,
  true,
  10
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
