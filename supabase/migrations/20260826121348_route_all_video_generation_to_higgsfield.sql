begin;

-- Higgsfield is the only generation provider. Keep the model fields explicit so
-- templates remain portable, and strip legacy Runway settings from each recipe.
update public.video_templates
set generation_config = (
  generation_config
  - 'runway_model'
  - 'runway_resolution'
) || jsonb_build_object(
  'provider', 'higgsfield',
  'higgsfield_model', 'seedance_2_0_mini',
  'higgsfield_resolution', coalesce(generation_config->>'higgsfield_resolution', generation_config->>'resolution', '720p')
)
where generation_config <> '{}'::jsonb;

-- Projects snapshot their recipe when queued. Update only jobs that have not
-- started so in-flight or completed audit records remain immutable.
update public.video_projects
set template_prompt_snapshot = (
  template_prompt_snapshot
  - 'runway_model'
  - 'runway_resolution'
) || jsonb_build_object(
  'provider', 'higgsfield',
  'higgsfield_model', 'seedance_2_0_mini',
  'higgsfield_resolution', coalesce(template_prompt_snapshot->>'higgsfield_resolution', template_prompt_snapshot->>'resolution', '720p')
)
where status = 'queued'
  and template_prompt_snapshot <> '{}'::jsonb;

commit;
