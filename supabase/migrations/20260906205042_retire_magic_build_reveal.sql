begin;

-- Keep the historical video project intact while removing this watermarked
-- template from every selectable/public product surface.
delete from public.template_favorites
where template_id = (
  select id
  from public.video_templates
  where slug = 'magic-build-reveal'
);

update public.video_templates
set is_active = false,
    is_featured = false,
    generation_config = jsonb_build_object(
      'retired', true,
      'reason', 'Watermarked preview removed'
    ),
    updated_at = now()
where slug = 'magic-build-reveal';

commit;
