-- Deploy the Kling-capable worker and configure KLING_API_KEY before applying.
-- Existing projects retain their original provider and prompt snapshots.
begin;
do $migration$
declare
  definition text := pg_get_functiondef('public.queue_video_project(bigint,bigint,bigint,text,bigint[],text,text)'::regprocedure);
begin
  if position('''provider'', ''higgsfield''' in definition) = 0 then raise exception 'Queue provider snapshot changed; inspect before migrating'; end if;
  definition := replace(definition, '''provider'', ''higgsfield''', '''provider'', coalesce(selected_template.generation_config->>''provider'', ''higgsfield''), ''template_slug'', selected_template.slug, ''kling_resolution'', target_resolution');
  definition := replace(definition, 'if coalesce(selected_template.generation_config->>''higgsfield_model''', 'if selected_template.generation_config->>''provider'' is distinct from ''kling'' and coalesce(selected_template.generation_config->>''higgsfield_model''');
  execute definition;
end;
$migration$;

create or replace function public.get_video_pricing(target_template_id bigint)
returns table(resolution text, multiplier integer, credits_cost integer)
language sql stable security invoker set search_path = '' as $$
  select p.resolution, p.multiplier, (t.credits_cost * p.multiplier)::integer
  from public.video_resolution_pricing p cross join public.video_templates t
  where t.id = target_template_id and t.is_active
    and (t.generation_config->>'provider' is distinct from 'kling' or p.resolution <> '480p')
  order by p.display_order;
$$;

-- Only the audited recipes have Kling adapters. Keep all original creative
-- direction and shot prompts for legacy jobs and traceability.
update public.video_templates
set generation_config = generation_config || jsonb_build_object(
  'provider', 'kling', 'kling_model', 'kling-3.0', 'kling_resolution', '1080p',
  'template_slug', slug, 'kling_planner_version', 'kling-photo-shots-v1'
), updated_at = now()
where is_active and slug in (
  'reflection-reveal', 'pulse-tour', 'foreground-reveal', 'find-your-way-home',
  'maple-glass-flight', 'warm-threshold', 'city-apartment', 'blueprint-to-reality',
  'house-behind-the-glass', 'prompt-film-15s', 'prompt-film-30s'
);
commit;
