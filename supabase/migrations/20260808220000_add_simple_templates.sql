begin;

insert into public.video_templates (
  category_id, name, slug, description, style_label, format, duration_seconds,
  credits_cost, min_photos, max_photos, preview_url, thumbnail_url, is_featured, sort_order, generation_config
)
select c.id, v.name, v.slug, v.description, v.style_label, v.format, v.duration_seconds,
  v.credits_cost, v.min_photos, v.max_photos, v.preview_url, v.thumbnail_url, v.is_featured, v.sort_order,
  v.generation_config
from (values
  (
    'Minimal', 'Simple Reveal', 'simple-reveal',
    'One clean camera move — the easiest way to turn photos into a tour.',
    'Minimal', '9:16', 10, 8, 4, 12, '/homes/modern-villa.jpg', '/homes/modern-villa.jpg', false, 100,
    '{
      "version": 1, "model": "seedance_2_0", "resolution": "720p",
      "base_prompt": "Simple, clean real-estate reveal. One smooth camera move, natural light, steady level horizon, no tricks.",
      "preservation_prompt": "Treat every supplied property image as ground truth. Preserve the exact architecture, room proportions, doors, windows, furniture, materials, landscaping, and lighting. Do not invent rooms, openings, floors, decor, text, people, or structural transitions that are not visible in the references.",
      "shots": [
        {"role": "reveal", "duration": 10, "prompt": "Slow, steady push toward the strongest room in the photo, easing to a calm still frame."}
      ]
    }'::jsonb
  ),
  (
    'Fast-paced', 'Quick Look', 'quick-look',
    'A fast, snappy preview for listings that need to be seen in seconds.',
    'Fast-paced', '1:1', 8, 6, 3, 10, '/homes/lounge.jpg', '/homes/lounge.jpg', false, 110,
    '{
      "version": 1, "model": "seedance_2_0", "resolution": "720p",
      "base_prompt": "Fast, energetic listing snapshot. One quick confident camera move, crisp motion, no clutter.",
      "preservation_prompt": "Treat every supplied property image as ground truth. Preserve the exact architecture, room proportions, doors, windows, furniture, materials, landscaping, and lighting. Do not invent rooms, openings, floors, decor, text, people, or structural transitions that are not visible in the references.",
      "shots": [
        {"role": "hook", "duration": 8, "prompt": "Open on the strongest photo with a quick confident push-in and a snappy, controlled stop."}
      ]
    }'::jsonb
  ),
  (
    'Family', 'Straight Walkthrough', 'straight-walkthrough',
    'A plain, steady two-shot walkthrough — arrival, then the main room.',
    'Casual', '9:16', 16, 11, 6, 16, '/homes/dining.jpg', '/homes/dining.jpg', false, 120,
    '{
      "version": 1, "model": "seedance_2_0", "resolution": "720p",
      "base_prompt": "Simple, straightforward walkthrough. Calm steady camera, natural pacing, nothing fancy.",
      "preservation_prompt": "Treat every supplied property image as ground truth. Preserve the exact architecture, room proportions, doors, windows, furniture, materials, landscaping, and lighting. Do not invent rooms, openings, floors, decor, text, people, or structural transitions that are not visible in the references.",
      "shots": [
        {"role": "arrival", "duration": 8, "prompt": "Steady push into the entrance or exterior view."},
        {"role": "interior", "duration": 8, "prompt": "Steady glide through the main interior space shown in the photo."}
      ]
    }'::jsonb
  ),
  (
    'Editorial', 'Clean Cuts', 'clean-cuts',
    'Minimal editorial pacing with plenty of negative space for a calm, modern feel.',
    'Effects', '16:9', 12, 9, 5, 14, '/homes/kitchen.jpg', '/homes/kitchen.jpg', false, 130,
    '{
      "version": 1, "model": "seedance_2_0", "resolution": "720p",
      "base_prompt": "Minimal, editorial-style presentation. Clean single moves, plenty of negative space, calm pacing.",
      "preservation_prompt": "Treat every supplied property image as ground truth. Preserve the exact architecture, room proportions, doors, windows, furniture, materials, landscaping, and lighting. Do not invent rooms, openings, floors, decor, text, people, or structural transitions that are not visible in the references.",
      "shots": [
        {"role": "feature", "duration": 6, "prompt": "Slow pan across the strongest architectural feature."},
        {"role": "closing", "duration": 6, "prompt": "Gentle push to a calm closing frame on the best remaining view."}
      ]
    }'::jsonb
  )
) as v(category_name, name, slug, description, style_label, format, duration_seconds, credits_cost, min_photos, max_photos, preview_url, thumbnail_url, is_featured, sort_order, generation_config)
join public.template_categories c on c.name = v.category_name
on conflict (slug) do nothing;

commit;
