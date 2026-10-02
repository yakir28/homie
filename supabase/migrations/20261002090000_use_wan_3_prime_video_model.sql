-- New projects generate with Wan 3.0 Prime (Higgsfield API reference-to-video):
-- up to 30s and 10 references per request, native 3:4/4:3, max 1080p.
-- Existing project snapshots are immutable and keep their original model.
begin;

do $migration$
declare
  definition text := pg_get_functiondef('public.queue_video_project(bigint,bigint,bigint,text,bigint[],text,text)'::regprocedure);
  guard text := $guard$
  if selected_template.generation_config->>'video_model' like 'wan-%' and target_resolution = '4k' then
    raise exception 'This template supports up to 1080p';
  end if;
  select q.credits_cost$guard$;
begin
  if (length(definition) - length(replace(definition, 'select q.credits_cost', ''))) / length('select q.credits_cost') <> 1 then
    raise exception 'Unexpected queue function: pricing step changed; inspect before migrating';
  end if;
  execute replace(definition, 'select q.credits_cost', guard);
end;
$migration$;

create or replace function public.get_video_pricing(target_template_id bigint)
returns table(resolution text, multiplier integer, credits_cost integer)
language sql stable security invoker set search_path = '' as $$
  select p.resolution, p.multiplier, (t.credits_cost * p.multiplier)::integer
  from public.video_resolution_pricing p cross join public.video_templates t
  where t.id = target_template_id and t.is_active
    and (coalesce(t.generation_config->>'provider','') not in ('kling','higgsfield_api') or p.resolution <> '480p')
    and (coalesce(t.generation_config->>'video_model','') not like 'wan-%' or p.resolution <> '4k')
  order by p.display_order;
$$;

update public.video_templates
set generation_config = generation_config || jsonb_build_object(
  'generation_mode', 'reference', 'video_model', 'wan-3.0-prime'
), updated_at = now()
where is_active and generation_config->>'provider' = 'higgsfield_api';

commit;
