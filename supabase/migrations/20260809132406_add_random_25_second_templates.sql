begin;

with new_templates as (
  select * from (values
    (
      'Timelapse',
      'Four Seasons Estate',
      'season-flash-25',
      'One property moves through winter, spring, summer and autumn in a cinematic 25-second reveal.',
      'Timelapse',
      330,
      'Create a photorealistic vertical seasonal transformation of the exact supplied property. Keep the house and camera geometry locked while the environment progresses naturally through winter, spring, summer and autumn. Preserve the exact facade, roofline, doors, windows, driveway, landscaping layout, materials and proportions. Finish with a controlled approach toward the real entrance. Premium stabilized real-estate cinematography; no people, text, logos, warped geometry, structural changes or invented features.',
      'Transform the environment from cool winter with light snow into fresh spring and early summer. Keep the exact supplied house unchanged and clearly recognizable. Use smooth natural seasonal transitions and restrained camera movement.',
      'Continue from lush summer into warm golden autumn, then settle on the most flattering current-season exterior and begin a slow controlled push toward the real front entrance. Preserve the supplied property exactly.'
    ),
    (
      'Timelapse',
      'Day to Night Glow',
      'day-to-night-flash-25',
      'A premium 25-second daylight-to-blue-hour transformation ending with the entire home glowing.',
      'Cinematic',
      340,
      'Create a photorealistic vertical day-to-night transformation of the exact supplied property. Lock the property identity, architecture, landscaping and camera geometry while time advances naturally from clear daylight through golden hour and dusk into blue night. Let practical exterior lights activate progressively and finish with every visible window and the entrance glowing warmly. Premium stabilized real-estate cinematography; no people, text, logos, flicker, warped geometry, structural changes or invented features.',
      'Begin in clear daylight and progress smoothly through late afternoon into rich golden hour. Move sunlight and shadows naturally across the exact supplied facade while every physical property detail remains unchanged.',
      'Continue from golden hour through dusk into deep blue night. Activate exterior practical lights progressively, then illuminate the visible windows and front entrance together with a warm realistic glow. Finish with a controlled push toward the entrance.'
    )
  ) as value(category_name, name, slug, description, style_label, sort_order, base_prompt, shot_one, shot_two)
), prepared as (
  select
    category.id as category_id,
    template.*,
    jsonb_build_object(
      'version', 2,
      'model', 'kling3_0_turbo',
      'resolution', '720p',
      'supports_generate_audio', false,
      'base_prompt', template.base_prompt,
      'preservation_prompt', 'Treat the supplied property image as immutable visual ground truth. Preserve its exact property identity, architecture, proportions, openings, materials, landscaping and surroundings. Do not add people, text, logos, watermarks, extra floors, openings or fabricated property features.',
      'shots', jsonb_build_array(
        jsonb_build_object('role', 'transformation_opening', 'duration', 12, 'reference_mode', 'start', 'prompt', template.shot_one),
        jsonb_build_object('role', 'hero_reveal', 'duration', 13, 'reference_mode', 'start', 'prompt', template.shot_two)
      )
    ) as generation_config
  from new_templates template
  join public.template_categories category on category.name = template.category_name
)
insert into public.video_templates (
  category_id, name, slug, description, style_label, format, duration_seconds,
  credits_cost, min_photos, max_photos, preview_url, thumbnail_url,
  generation_config, is_featured, is_active, sort_order
)
select
  category_id, name, slug, description, style_label, '9:16', 25,
  36, 2, 12,
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
