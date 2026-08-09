begin;

with generated_templates as (
  select * from (values
    ('Luxury', 'Golden Hour Flow', 'golden-hour-flow', 'A sunlit poolside approach flows seamlessly into a refined luxury interior.', 'Luxury', 270,
      'Create a photorealistic golden-hour luxury real-estate film using the supplied property photos. Begin with a slow stabilized approach across the pool toward the exact villa, then transition naturally through the glazing into the matching living room and kitchen. Use warm sunset reflections, subtle water movement, premium restrained camera motion, and soft cinematic ambience. Preserve the property exactly; no people, text, logos, or invented rooms.'),
    ('Warm', 'Forest Morning Flow', 'forest-morning-flow', 'A quiet misty cabin approach opens into a warm Scandinavian interior.', 'Casual', 280,
      'Create a photorealistic Scandinavian cabin tour from the supplied photos. Start with a gentle stabilized move through the misty pine setting toward the exact facade, then flow into the matching living space and bedroom with natural morning light. Keep the pacing calm, tactile, and inviting with subtle forest ambience. Preserve all architecture, materials, furniture, and room geometry; no people, text, logos, or invented spaces.'),
    ('Urban', 'Skyline After Dark', 'skyline-after-dark', 'A blue-hour rooftop reveal glides into a polished city penthouse.', 'Cinematic', 290,
      'Create a photorealistic vertical penthouse tour using the supplied property photos. Begin with a controlled blue-hour rooftop rise and skyline parallax, approach the exact glass facade, then transition into the matching living area and terrace. Use refined city ambience, realistic reflections, and smooth premium motion. Preserve the exact architecture, skyline, furniture, and lighting; no people, text, logos, or fabricated rooms.'),
    ('Effects', 'Sunset Light Sweep', 'sunset-light-sweep', 'A restrained magical light sweep reveals a villa before entering the home.', 'Effects', 300,
      'Create a cinematic vertical villa reveal from the supplied references. Begin on the exterior pool view, send a restrained magical light sweep across the facade, and push through the glazing into the matching interior. The effect must feel premium and physically coherent, never destructive. Preserve the exact architecture and materials; no people, text, logos, or invented features.'),
    ('Warm', 'Misty Cabin Orbit', 'misty-cabin-orbit', 'A stabilized forest orbit draws viewers toward a warmly lit cabin entrance.', 'Casual', 310,
      'Create a photorealistic vertical reveal of the exact supplied forest home. Execute a slow stabilized orbit from the approach toward the warm entry while mist and nearby foliage move gently. Continue inside using the supplied room references when available. Keep quiet natural ambience and preserve architecture, materials, proportions, and lighting; no people, text, logos, or invented rooms.'),
    ('Urban', 'Blue Hour City Pulse', 'blue-hour-city-pulse', 'A precise cinematic rise brings a glowing rooftop residence to life.', 'Viral Trends', 320,
      'Create a photorealistic vertical city residence reveal from the supplied photos. Use a controlled cinematic rise and gentle push toward the glowing facade while the blue-hour skyline gains subtle parallax and terrace lights shimmer naturally. Transition into supplied interior references if present. Preserve architecture and skyline geometry exactly; no people, text, logos, or fabricated spaces.')
  ) as value(category_name, name, slug, description, style_label, sort_order, prompt)
), prepared as (
  select
    category.id as category_id,
    generated.*,
    jsonb_build_object(
      'version', 2,
      'model', 'seedance1_5',
      'resolution', '720p',
      'generate_audio', true,
      'base_prompt', generated.prompt,
      'preservation_prompt', 'Treat every supplied property image as immutable ground truth. Preserve the exact property identity, architecture, room proportions, doors, windows, furniture, materials, landscaping, lighting, and skyline. Do not invent rooms, openings, floors, decor, text, logos, watermarks, or people.',
      'shots', jsonb_build_array(
        jsonb_build_object('role', 'cinematic_reveal', 'duration', 8, 'generate_audio', true, 'prompt', generated.prompt)
      )
    ) as generation_config
  from generated_templates generated
  join public.template_categories category on category.name = generated.category_name
)
insert into public.video_templates (
  category_id, name, slug, description, style_label, format, duration_seconds,
  credits_cost, min_photos, max_photos, preview_url, thumbnail_url,
  generation_config, is_featured, is_active, sort_order
)
select
  category_id, name, slug, description, style_label, '9:16', 8,
  12, 4, 16,
  '/api/media/template?key=templates/' || slug || '/preview.mp4',
  '/api/media/template?key=templates/' || slug || '/thumbnail.jpg',
  generation_config, false, true, sort_order
from prepared
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
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;
