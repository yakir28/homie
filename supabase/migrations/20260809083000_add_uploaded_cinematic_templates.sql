begin;

with uploaded_templates as (
  select * from (values
    (
      'Cinematic',
      'Magic Build Reveal',
      'magic-build-reveal',
      'An empty lot transforms into a finished home before flowing into the interior.',
      'Viral Trends',
      '/api/media/template?key=templates/cinematic-second/preview.mp4',
      '/api/media/template?key=templates/cinematic-second/thumbnail.jpg',
      250,
      'Create a cinematic vertical real-estate reveal that begins on the supplied exterior or lot reference. Use a polished magical construction transition: the finished property forms cleanly and coherently, then the camera advances toward the entrance and transitions into the supplied interior. Keep the real architecture and rooms exact, avoid text and people, and use subtle premium light particles rather than destructive effects.'
    ),
    (
      'Cinematic',
      'Smooth Cinematic Reveal',
      'smooth-cinematic-reveal',
      'A seamless exterior-to-interior reveal with calm premium camera movement.',
      'Cinematic',
      '/api/media/template?key=templates/smooth-cinematic-reveal/preview.mp4',
      '/api/media/template?key=templates/smooth-cinematic-reveal/thumbnail.jpg',
      260,
      'Create a smooth premium vertical real-estate reveal from the supplied property images. Begin with a controlled exterior approach, glide naturally toward the front door, and use a seamless match transition into the supplied interior. Continue with restrained cinematic movement, stable geometry, realistic lighting, and warm ambient sound. Preserve every visible architectural and furnishing detail; do not add text, logos, people, or unseen rooms.'
    )
  ) as value(category_name, name, slug, description, style_label, preview_url, thumbnail_url, sort_order, prompt)
), prepared as (
  select
    category.id as category_id,
    uploaded.*,
    jsonb_build_object(
      'version', 2,
      'model', 'seedance_2_0',
      'resolution', '720p',
      'generate_audio', true,
      'base_prompt', uploaded.prompt,
      'preservation_prompt', 'Treat every supplied property image as immutable ground truth. Preserve the exact property identity, architecture, room proportions, doors, windows, furniture, materials, landscaping, and lighting. Do not invent rooms, openings, floors, decor, text, logos, watermarks, or people.',
      'shots', jsonb_build_array(
        jsonb_build_object('role', 'cinematic_reveal', 'duration', 10, 'generate_audio', true, 'prompt', uploaded.prompt)
      )
    ) as generation_config
  from uploaded_templates uploaded
  join public.template_categories category on category.name = uploaded.category_name
)
insert into public.video_templates (
  category_id, name, slug, description, style_label, format, duration_seconds,
  credits_cost, min_photos, max_photos, preview_url, thumbnail_url,
  generation_config, is_featured, is_active, sort_order
)
select
  category_id, name, slug, description, style_label, '9:16', 10,
  12, 4, 16, preview_url, thumbnail_url,
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
