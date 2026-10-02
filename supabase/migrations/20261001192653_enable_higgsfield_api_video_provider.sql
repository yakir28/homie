-- New jobs use the public Higgsfield API; existing snapshots stay unchanged.
begin;
do $$
declare definition text := pg_get_functiondef('public.queue_video_project(bigint,bigint,bigint,text,bigint[],text,text)'::regprocedure);
begin
  if position('selected_template.generation_config->>''provider'' is distinct from ''kling''' in definition)=0 then
    raise exception 'Provider validation changed; inspect before migration';
  end if;
  definition := replace(definition, 'selected_template.generation_config->>''provider'' is distinct from ''kling''', 'coalesce(selected_template.generation_config->>''provider'', '''') not in (''kling'', ''higgsfield_api'')');
  execute definition;
end $$;
create or replace function public.get_video_pricing(target_template_id bigint)
returns table(resolution text, multiplier integer, credits_cost integer)
language sql stable security invoker set search_path = '' as $$
  select p.resolution, p.multiplier, (t.credits_cost * p.multiplier)::integer
  from public.video_resolution_pricing p cross join public.video_templates t
  where t.id = target_template_id and t.is_active
    and (coalesce(t.generation_config->>'provider','') not in ('kling','higgsfield_api') or p.resolution <> '480p')
  order by p.display_order;
$$;
update public.video_templates
set generation_config = generation_config || jsonb_build_object('provider','higgsfield_api','video_model','kling-3.0','template_slug',slug), updated_at=now()
where is_active and slug in ('reflection-reveal','pulse-tour','foreground-reveal','find-your-way-home','maple-glass-flight','warm-threshold','city-apartment','blueprint-to-reality','house-behind-the-glass','prompt-film-15s','prompt-film-30s');
commit;
