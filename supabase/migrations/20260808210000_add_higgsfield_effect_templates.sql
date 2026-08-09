begin;

insert into public.template_categories (name, slug, sort_order) values
  ('Viral Trends', 'viral-trends', 15),
  ('Casual', 'casual', 25),
  ('Timelapse', 'timelapse', 35),
  ('Effects', 'effects', 45)
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

with effect_templates(category_name, name, slug, description, style_label, hook_prompt, thumbnail_url, sort_order) as (
  values
    ('Viral Trends', 'House Landing', 'house-landing',
      'The real listing lands cinematically on its lot before the walkthrough begins.', 'Viral Trends',
      'Begin above an empty grassy lot under a clear blue daylight sky. In slow motion, the exact referenced house descends and lands intact in a bloom of warm light and magical swirling dust, with restrained camera shake and a cinematic bass impact. Dust clears as the camera settles on the unchanged real facade. Magical, premium, physically coherent.',
      '/homes/modern-villa.jpg', 110),
    ('Timelapse', 'Magic Build', 'magic-build',
      'A magical construction timelapse builds the listing from foundation to landscaping.', 'Timelapse',
      'Begin on an empty aerial lot. In one fluid four-second magical timelapse, foundation traces appear, walls rise, roof and windows lock into place, and landscaping grows with refined light particles at each stage. Finish by matching the exact referenced completed house and hold for a satisfying completion chime. Upbeat rhythmic construction sound design.',
      '/homes/modern-villa.jpg', 120),
    ('Viral Trends', 'Gift Box Reveal', 'gift-box-reveal',
      'A giant gift box unfolds like origami to reveal the real listing.', 'Viral Trends',
      'A premium oversized gift box rests on the property lot. The ribbon unties and floats away, the lid rises, and the box walls unfold outward like elegant origami. Inside, reveal the exact referenced house fully formed and unchanged. Playful anticipation builds into a bright reveal chime; keep the transformation clean, upscale, and cinematic.',
      '/homes/dining.jpg', 130),
    ('Effects', 'Map Dive', 'map-dive',
      'A continuous satellite-style neighborhood zoom arrives at the exact property.', 'Effects',
      'Start on a clean stylized satellite map of a city neighborhood with no labels or logos. Perform a dramatic continuous dive through streets and rooftops toward one destination. Transition smoothly from graphic map texture to photoreal aerial footage and land precisely on the exact referenced house. Rising tension resolves with a confident arrival hit.',
      '/homes/modern-villa.jpg', 140),
    ('Effects', 'Miniature to Reality', 'miniature-to-reality',
      'A tabletop architectural model transforms into the full-scale property.', 'Effects',
      'A handcrafted miniature house sits on a warm wooden table in soft studio light. Slowly push toward it as the model gains realistic materials and scale; the tabletop dissolves into the authentic outdoor setting. Complete the transformation on the exact referenced full-size house. Whimsical orchestral texture swells into a refined magical resolve.',
      '/homes/lounge.jpg', 150),
    ('Effects', 'Magic Doorway', 'magic-doorway',
      'A floating doorway opens from a misty void into the listing.', 'Effects',
      'An elegant unbranded wooden door floats upright in a soft white mist. It opens by itself and warm light pours through. Move through the doorway as the mist becomes the real outdoor approach, ending on the exact referenced property facade. Ethereal sound design resolves into welcoming ambient warmth; smooth, mysterious, premium.',
      '/homes/living-room.jpg', 160),
    ('Effects', 'Puzzle Assembly', 'puzzle-assembly',
      'Room-photo fragments assemble into the complete listing reveal.', 'Effects',
      'Against a deep charcoal studio background, photographic fragments suggesting rooms and architectural details float in depth. They accelerate together and lock into one complete exterior composition with crisp rhythmic clicks. The assembled image gains depth and becomes the exact referenced real house. Keep every fragment elegant and free of text.',
      '/homes/kitchen.jpg', 170),
    ('Viral Trends', 'Reverse Explosion', 'reverse-explosion',
      'Scattered architectural components rush together into the finished house.', 'Viral Trends',
      'Begin with tasteful architectural components suspended in a clean exploded arrangement: wall planes, roof sections, windows, doors, and landscaping elements. In one dramatic reverse-motion beat, every component rushes inward and assembles cleanly into the exact referenced house. Use a powerful reversed impact and a precise cinematic hit; magical, not destructive.',
      '/homes/modern-villa.jpg', 180),
    ('Timelapse', 'Season Flash', 'season-flash',
      'The property flashes through winter, spring, summer, and autumn.', 'Timelapse',
      'Hold the exact house composition while the environment flashes rhythmically through snowy winter, blooming spring, lush summer, and golden autumn, each under one second. Architecture and camera remain perfectly locked. Land on the original current-season reference. Percussive accents match each season change, then resolve into calm ambience.',
      '/homes/modern-villa.jpg', 190),
    ('Effects', 'Glass Shatter', 'glass-shatter',
      'A polished glass-shatter transition opens the exterior into the tour.', 'Effects',
      'Reveal the exact referenced house as a luminous image suspended in dark space. Its surface fractures like clean cinematic glass and the shards sweep safely past the camera, exposing the unchanged real facade behind them. Push through the opening with a sharp synchronized shatter and soft ambient resolve. Premium visual effect, no damage to the property.',
      '/homes/lounge.jpg', 200),
    ('Viral Trends', 'Window Flythrough', 'window-flythrough',
      'A fast drone approach phases seamlessly through a window into the home.', 'Fast-paced',
      'Begin on the exact referenced exterior. Accelerate in a stabilized aerial push toward the clearest visible window. Just before contact, phase seamlessly through intact glass with no breakage, using a fast optical morph into the next supplied interior reference. Energetic wind and one precise whoosh soften immediately into warm interior ambience.',
      '/homes/modern-villa.jpg', 210),
    ('Effects', 'Silhouette Reveal', 'silhouette-reveal',
      'Color, materials, lights, and landscaping fill a sunset silhouette.', 'Effects',
      'Begin with the exact house shape as a clean black silhouette against a vivid natural sunset. Real detail fills upward in a controlled wave: landscaping, wall materials, roof, then warm window light. Finish on the exact referenced realistic property with unchanged proportions. Warm orchestral swell follows the fill and resolves gently.',
      '/homes/modern-villa.jpg', 220),
    ('Timelapse', 'Day to Night', 'day-to-night',
      'A rapid daylight-to-night timelapse ends with every window glowing.', 'Timelapse',
      'Keep the exact exterior and camera completely locked while daylight moves rapidly through golden hour, dusk, and blue night. At the final beat, all visible windows illuminate together with warm realistic light. Preserve the architecture and landscaping exactly. A soft rising musical swell peaks with one warm completion chime.',
      '/homes/modern-villa.jpg', 230),
    ('Viral Trends', 'Drone Selfie Reveal', 'drone-selfie-reveal',
      'A fast low drone move wraps the exterior and dives into the walkthrough.', 'Fast-paced',
      'Begin on the exact referenced exterior with a fast, low, stabilized FPV-style approach. Bank gently around one architectural feature, then aim toward the front entry. Use a seamless optical transition into the next supplied interior rather than inventing unseen geometry. Energetic music and wind whooshes soften into warm ambience inside.',
      '/homes/modern-villa.jpg', 240)
), prepared as (
  select
    c.id as category_id,
    e.*,
    jsonb_build_object(
      'version', 2,
      'model', 'seedance_2_0',
      'resolution', '720p',
      'generate_audio', true,
      'base_prompt', 'Create a premium vertical real-estate social video with physically coherent motion, polished cinematic lighting, stable composition, and one clear visual idea per shot.',
      'preservation_prompt', 'Treat supplied property images as immutable ground truth. Match the exact house identity, architecture, room proportions, openings, furniture, materials, landscaping, and lighting. Keep text, logos, watermarks, people, and invented property features out of frame.',
      'shots', jsonb_build_array(
        jsonb_build_object('role', 'viral_hook', 'duration', 8, 'reference_mode', 'end', 'generate_audio', true, 'prompt', e.hook_prompt),
        jsonb_build_object('role', 'interior_reveal', 'duration', 6, 'generate_audio', true, 'prompt', 'Push toward the visible entry, then use a seamless editorial match transition into the supplied main interior. Continue with one smooth controlled glide that preserves the room exactly; warm ambient music replaces the reveal sound.'),
        jsonb_build_object('role', 'closing', 'duration', 6, 'generate_audio', true, 'prompt', 'Reveal the strongest remaining supplied room or property feature with a restrained cinematic push, then ease into a clean hero frame. Preserve every visible detail and finish the music with a soft premium resolve.')
      )
    ) as generation_config
  from effect_templates e
  join public.template_categories c on c.name = e.category_name
)
insert into public.video_templates (
  category_id, name, slug, description, style_label, format,
  duration_seconds, credits_cost, min_photos, max_photos,
  preview_url, thumbnail_url, generation_config, is_featured, is_active, sort_order
)
select
  category_id, name, slug, description, style_label, '9:16',
  20, 22, 6, 24,
  thumbnail_url, thumbnail_url, generation_config, false, true, sort_order
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
  generation_config = excluded.generation_config,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;
