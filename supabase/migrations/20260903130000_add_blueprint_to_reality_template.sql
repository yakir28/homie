begin;

with viral_category as (
  select id
  from public.template_categories
  where slug = 'viral-trends'
  limit 1
)
insert into public.video_templates (
  category_id, name, slug, description, style_label, format,
  duration_seconds, credits_cost, min_photos, max_photos,
  preview_url, thumbnail_url, generation_config,
  is_featured, is_active, sort_order
)
select
  viral_category.id,
  'Blueprint to Reality',
  'blueprint-to-reality',
  'The real listing emerges from its own architectural blueprint in one continuous transformation.',
  'Viral Trends',
  '3:4',
  30,
  60,
  4,
  10,
  '/templates/blueprint-to-reality/poster.png',
  '/templates/blueprint-to-reality/poster.png',
  jsonb_build_object(
    'version', 6,
    'provider', 'higgsfield',
    'higgsfield_model', 'seedance_2_5',
    'higgsfield_mode', 'omni_reference',
    'higgsfield_bitrate_mode', 'high',
    'higgsfield_resolution', '1080p',
    'supports_generate_audio', true,
    'generate_audio', false,
    'workflow', 'single_30s_all_references',
    'reference_policy', 'All supplied images are chronological fixed visual anchors. Never reorder, merge or redesign them.',
    'base_prompt', 'Create one fully silent 30-second portrait 3:4 architectural transformation film as one continuous camera performance. The visual idea is a living blueprint that becomes the exact supplied real home. Use deep blueprint paper #16233F, crisp draft-white CAD linework #EAF2FF and a cold green-biased acid-chartreuse accent #D1EF17. CAD is honest one-pixel technical linework with zero glow; reality is authentic attainable MLS photography, never glossy CGI.',
    'preservation_prompt', 'Treat every supplied property image as immutable ground truth. Lock the exact facade, roofline, garage, porch, doors, windows, driveway, vegetation, walls, ceiling, openings, flooring, cabinetry, furniture identity, count and position. Never reorder, merge, upscale, beautify or redesign references. Drawing and reality are the same geometry and every plotted line must land exactly on its material twin. No people, pets, cars, readable text, letters, numbers, signs, logos or watermarks.',
    'timed_prompt', '0.0-3.5s: begin face-on over empty deep-blue blueprint paper; plot one cold chartreuse centerline and grow a matching draft-white front elevation from it at pen speed. 3.5-7.0s: tilt the completed drawing plane backward into depth while the same shallow clockwise arc resolves it into a matching three-quarter axonometric wireframe. 7.0-12.0s: send the chartreuse route line through driveway and door as current; matter grows directly from connected lines ground-to-roof into the exact real house while blueprint paper develops into the real cloudy setting from the property silhouette outward, never as a straight wipe. 12.0-15.0s: hold the exact real facade, then rise slightly and tilt to plumb top-down until the ground plane becomes its matching blueprint floor plan. 15.0-19.0s: descend through the plan as its lines extrude into the exact living-room reference; settle at eye height with a restrained three-percent glide and lock all objects. 19.0-22.5s: let a real doorway edge briefly occlude frame and reveal the next supplied kitchen/dining reference without inventing a corridor; execute a two-percent lateral slide. 22.5-25.5s: use the supplied rear opening as a brief natural occlusion, reveal the backyard reference and drift backward three percent with only existing foliage moving. 25.5-29.0s: continue the pullback and rise to the supplied front composition while draft-white proof lines plot exactly over the real roof, garage, porch, door and windows; chartreuse dimension arrows snap between levels, then all lines sink into their material twins as light warms naturally. 29.0-30.0s: centered facade hold for one full second with clean negative space for editor-added copy. One 28mm lens, stable verticals, continuous S-curve velocity, no cuts, fades, dissolves, wipes, split screens, screen-space boundaries, speed ramps, camera shake, flares, floating particles, geometry drift, flicker, ghosting or impossible wall passage. Once real, geometry remains real.',
    'post_copy', jsonb_build_array('DRAWN TO BE LIVED IN.', 'EXACTLY AS ENVISIONED.'),
    'default_aspect_ratio', '3:4',
    'default_duration_seconds', 30
  ),
  false,
  false,
  115
from viral_category
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
