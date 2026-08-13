begin;

-- Keep historical video projects intact while removing every unused template
-- that is no longer approved for the Explore catalog.
update public.video_templates
set is_active = false,
    updated_at = now()
where name not in ('Mediterranean Light', 'City After Dark', 'Magic Build Reveal');

delete from public.template_favorites favorites
using public.video_templates templates
where favorites.template_id = templates.id
  and templates.name not in ('Mediterranean Light', 'City After Dark', 'Magic Build Reveal');

delete from public.video_templates templates
where templates.name not in ('Mediterranean Light', 'City After Dark', 'Magic Build Reveal')
  and not exists (
    select 1
    from public.video_projects projects
    where projects.template_id = templates.id
  );

update public.video_templates
set is_active = true,
    updated_at = now()
where name in ('Mediterranean Light', 'City After Dark', 'Magic Build Reveal');

commit;
