-- Lights On and Grand Entrance previews were scored with a third-party licensed
-- track. They are rebuilt from the same Seedance chapters with Homie's own
-- AI-generated library music and served from R2 like the other templates.
update public.video_templates t
set preview_url = '/api/media/template?key=templates/' || t.slug || '/preview-v2.mp4',
    thumbnail_url = '/api/media/template?key=templates/' || t.slug || '/thumbnail-v2.jpg',
    generation_config = t.generation_config || jsonb_build_object(
      'preview_provenance', coalesce(t.generation_config->'preview_provenance', '{}'::jsonb) || jsonb_build_object(
        'music', m.track,
        'music_license', 'AI-generated via Higgsfield (Sonilo Music), 2026-10-07',
        'rebuilt_at', '2026-10-11'
      )
    ),
    updated_at = now()
from (values ('lights-on', 'modern-02'), ('grand-entrance', 'energetic-02')) as m(slug, track)
where t.slug = m.slug;
