begin;

with viral_category as (
  select id
  from public.template_categories
  where slug = 'viral-trends'
  limit 1
),
template_source as (
  select *
  from (values
    (
      'Blueprint to Reality'::text,
      'blueprint-to-reality'::text,
      'The real listing emerges from its own architectural blueprint in one continuous transformation.'::text,
      4::integer,
      '/api/media/template?key=templates/blueprint-to-reality/preview.mp4'::text,
      '/api/media/template?key=templates/blueprint-to-reality/thumbnail.jpg'::text,
      $blueprint$SCENE CONTEXT
Create a fully silent architectural launch film as one uninterrupted visual journey. A living blueprint progressively becomes the exact supplied real home. Every transition is caused by plotted geometry, extrusion, materialization, a real architectural occluder, or a proof overlay inside the scene. There are no editorial cuts, dissolves, fades, wipes, split screens, or screen-space transformation boundaries.

FIRST FRAME
Deep blueprint paper fills the frame with a faint millimeter grid. A single cold chartreuse centerline begins plotting through the precise location from which the supplied home's elevation will grow.

CAMERA — ONE CONTINUOUS PERFORMANCE
Begin static and face-on to the drafting plane. As the elevation completes, tilt the drawing into depth and arc gently into a matching three-quarter axonometric. Rise with the ink-to-matter ignition, then move to a plumb top-down view where the same geometry reads as a floor plan. Descend through that plan into the supplied living room, settle at eye height, and continue through the ordered interior and rear references using only real mullions, door edges, or verified openings as brief natural occluders. Finish with one calm pull-back and rise to the exact front facade. Motion follows soft S-curves and never stops before the final hold.

ACTION PROGRESSION
The centerline plots the front elevation at honest CAD pen speed. The completed drawing tilts into a wireframe volume. Chartreuse linework acts as a current: connected slab, wall, roof, window, driveway, porch, door, and landscape lines gain real mass from the linework itself, bottom-to-top and element-by-element. Blueprint paper develops outward from the property silhouette into the real environment. A top-down plan then extrudes into the exact living room; oak flooring, walls, windows, furniture, and daylight arrive only where their plotted twins exist. Ordered rooms are revealed through architecture already visible in the references, never through an invented corridor. At the rear exterior, the camera begins its closing pull-back. Draft-white and chartreuse proof lines plot directly over the completed home's real edges, align exactly, and sink into the materials without displacing them. The light warms naturally while the home remains unchanged. End on a centered, stable facade with clean negative space for application-added copy.

DRAWING / REALITY LANGUAGE
Blueprint layer: deep paper #16233F, crisp one-pixel draft-white #EAF2FF linework, faint grid, dimension ticks and a cold green-biased chartreuse #D1EF17 accent, zero glow. Reality layer: truthful attainable real-estate photography with natural materials, physically correct glass, modest landscaping and balanced daylight. Drawing and reality are the same geometry; every line lands on its material twin.

GRAPHICS, AUDIO, QUALITY
Generate no readable text, letters, numbers, logos, captions, signs, watermarks, music, speech, ambience, or sound effects. Keep straight verticals, a stable horizon, restrained 28–35mm optics, sharp temporal consistency, subtle motion blur, and no flicker, ghosting, texture boiling, geometry drift, floating objects, people, pets, cars, flares, impossible camera passage, or speculative architecture. Once a real element materializes it stays real through the closing hold.$blueprint$::text
    ),
    (
      'The House Behind the Glass'::text,
      'house-behind-the-glass'::text,
      'A realistic family home reveals itself through reflections, windows and architectural frames.'::text,
      6::integer,
      '/api/media/template?key=templates/house-behind-the-glass/preview.mp4'::text,
      '/api/media/template?key=templates/house-behind-the-glass/thumbnail.jpg'::text,
      $glass$SCENE CONTEXT
Create a fully silent photorealistic real-estate reveal for the exact attainable family home in the references, as one continuous cinematic journey built around glass. The house initially withholds itself behind a dark reflective front window. Each new space is discovered through a real pane, mullion, doorway, frame edge, or physically plausible reflection already present in the ordered references. Glass is never a fantasy portal; it alternately reflects the neighborhood, reveals a verified room, and hides a seamless architectural transition.

WORLD / HERO
Preserve the exact ordinary detached home and its consistent material identity: facade, roof, garage, front door, signature dark-framed living-room window, neighboring context, mature trees, modest shrubs, imperfect lawn, driveway and sidewalk. Preserve every supplied interior exactly: warm-white walls, oak floors, woven rugs, restrained neutral furniture, muted olive accents, natural wood, dark window frames and believable practical lighting. The result is cared-for and inviting, never mansion-like or CGI-perfect.

REFERENCE ORDER
Use every supplied image as a fixed visual anchor in its supplied chronological order: exterior identity, restrained evening state, reflective front-window threshold, revealed living room, verified living-room viewpoint, kitchen and dining, bedroom, rear-door axis, backyard, and the illuminated closing facade. Never reorder, merge, redesign, borrow furniture between rooms, change openings, or invent a route.

FIRST FRAME
Begin extremely close to the exact front living-room window at blue hour. Crisp dark mullions and physically layered reflections of tree canopy and cool sky dominate the composition while the interior is barely perceptible. A shallow lateral drift changes the viewing angle, gently weakening only the plausible part of the reflection until the exact warm living room becomes visible behind the same unchanged pane.

CAMERA — ONE CONTINUOUS VISUAL GRAMMAR
Move like a precise compact gimbal with natural 28–35mm real-estate optics, straight verticals and soft curved acceleration. Approach a real mullion until it naturally fills the frame and conceals the handoff to the verified interior. Continue in the same direction across the living room. Use only existing doorway edges and dark frame occluders to reveal the kitchen and dining view without claiming an unsupported hallway. Follow a vertical window frame upward to motivate the bedroom reveal. Withdraw behind a real door edge, return to the kitchen, align with the verified rear slider, and reveal the matching backyard. A final dark frame edge conceals the return to the exact front facade, where the camera eases backward into a stable welcoming hold. No drone flight, door-opening hook, FPV rush, whip pan, crash zoom, orbit, or camera passage through walls, furniture, or solid glass.

ACTION / PHYSICS / LIGHT
Reflections strengthen or fade only when camera angle and relative illumination justify it. Mullions never bend, multiply, slide, or dissolve. Rooms, windows, cabinetry, furniture and landscaping remain rigid. Only subtle curtains, plant leaves and outdoor foliage may move. Follow one coherent evolution from cool early blue hour to a slightly deeper blue closing state as warm practical lights gradually become legible without clipping. Cool reflections and warm rooms coexist naturally on each pane.

GRAPHICS, AUDIO, QUALITY
Generate no readable text, address, signs, sale boards, UI, logos, captions, subtitles, watermarks, music, narration, ambience, or effects. Maintain sharp temporal coherence in window grids, siding, roof edges, furniture and rooms. Avoid flicker, ghosting, frame blending, stutter, texture boiling, identity drift, artificial bloom, fantasy luxury styling, people, pets, vehicles, duplicated objects, moving furniture, invented openings, impossible reflections, and generative morphs.$glass$::text
    )
  ) as entries(name, slug, description, min_photos, preview_url, thumbnail_url, director_prompt)
)
insert into public.video_templates (
  category_id, name, slug, description, style_label, format,
  duration_seconds, credits_cost, min_photos, max_photos,
  preview_url, thumbnail_url, generation_config,
  is_featured, is_active, sort_order
)
select
  viral_category.id,
  template_source.name,
  template_source.slug,
  template_source.description,
  'Viral Trends',
  '3:4',
  30,
  60,
  template_source.min_photos,
  10,
  template_source.preview_url,
  template_source.thumbnail_url,
  jsonb_build_object(
    'version', 7,
    'provider', 'higgsfield',
    'higgsfield_model', 'seedance_2_5',
    'higgsfield_mode', 'omni_reference',
    'higgsfield_bitrate_mode', 'high',
    'higgsfield_resolution', '1080p',
    'supports_generate_audio', true,
    'generate_audio', false,
    'workflow', 'single_30s_all_references',
    'reference_policy', 'All supplied images are chronological fixed visual anchors. Preserve them exactly and never reorder, merge, or redesign them.',
    'base_prompt', 'Create one premium, photorealistic 30-second portrait 3:4 real-estate film as a single Seedance 2.5 omni-reference generation using every supplied reference.',
    'preservation_prompt', 'Treat every supplied property image as immutable ground truth. Preserve exact architecture, dimensions, openings, materials, furniture, landscaping, lighting identity, and neighborhood context. Do not invent rooms, passages, floors, decor, people, pets, vehicles, signs, text, logos, or watermarks.',
    'director_prompt', template_source.director_prompt,
    -- The deployed worker still reads this legacy key; its content intentionally has no timecodes.
    'timed_prompt', template_source.director_prompt,
    'default_aspect_ratio', '3:4',
    'default_duration_seconds', 30
  ),
  true,
  true,
  case template_source.slug
    when 'blueprint-to-reality' then 7
    when 'house-behind-the-glass' then 8
  end
from template_source
cross join viral_category
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
