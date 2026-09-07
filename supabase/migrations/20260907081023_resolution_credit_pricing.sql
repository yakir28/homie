-- One pricing source for both quotes and wallet debits. Change multipliers here
-- (or through an administrator-only migration), never in the browser.
create table public.video_resolution_pricing (
  resolution text primary key check (resolution in ('480p','720p','1080p','4k')),
  multiplier integer not null check (multiplier > 0),
  display_order integer not null
);
alter table public.video_resolution_pricing enable row level security;
revoke all on public.video_resolution_pricing from public, anon, authenticated;
grant select on public.video_resolution_pricing to authenticated;
create policy "Authenticated users can read video pricing"
on public.video_resolution_pricing for select to authenticated using (true);
insert into public.video_resolution_pricing values ('480p',1,1),('720p',2,2),('1080p',3,3),('4k',5,4);

create function public.get_video_pricing(target_template_id bigint)
returns table(resolution text, multiplier integer, credits_cost integer)
language sql stable security invoker set search_path = '' as $$
  select p.resolution, p.multiplier, (t.credits_cost * p.multiplier)::integer
  from public.video_resolution_pricing p cross join public.video_templates t
  where t.id = target_template_id and t.is_active
  order by p.display_order;
$$;
revoke all on function public.get_video_pricing(bigint) from public, anon;
grant execute on function public.get_video_pricing(bigint) to authenticated;

-- Preserve the existing queue's authentication, workspace checks, trial limits,
-- photo validation and transactional ledger while applying resolution pricing.
do $migration$
declare definition text;
begin
  definition := pg_get_functiondef('public.queue_video_project(bigint,bigint,bigint,text,bigint[],text,text)'::regprocedure);
  if position('balance = balance - selected_template.credits_cost' in definition) = 0 then
    raise exception 'Queue function changed; review pricing migration before applying';
  end if;
  definition := replace(definition, 'selected_recipe jsonb;', 'selected_recipe jsonb; computed_credit_cost integer;');
  definition := replace(definition, 'selected_template.credits_cost', 'computed_credit_cost');
  definition := replace(definition, '  selected_count :=', E'  select q.credits_cost into computed_credit_cost from public.get_video_pricing(target_template_id) q where q.resolution = target_resolution;\n  if computed_credit_cost is null or computed_credit_cost < 1 then raise exception ''Video pricing unavailable''; end if;\n  selected_count :=');
  execute definition;
end;
$migration$;

alter table public.video_projects add column creation_request_id uuid;
create unique index video_projects_creation_request on public.video_projects(created_by, creation_request_id) where creation_request_id is not null;

-- Only this checked entry point can be called by the client. A retry with the
-- same request id returns the same project instead of charging again.
create function public.queue_priced_video_project(
  target_workspace_id bigint, target_listing_id bigint, target_template_id bigint,
  project_title text, selected_photo_ids bigint[], target_aspect_ratio text,
  target_resolution text, expected_credits integer, request_id uuid
) returns public.video_projects language plpgsql security definer set search_path = '' as $$
declare result public.video_projects; actual_cost integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not private.is_workspace_member(target_workspace_id) then raise exception 'Workspace access denied'; end if;
  if request_id is null then raise exception 'Request id required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || request_id::text, 0));
  select * into result from public.video_projects where created_by = auth.uid() and creation_request_id = request_id;
  if found then
    if result.workspace_id <> target_workspace_id or result.listing_id <> target_listing_id
      or result.template_id <> target_template_id or result.output_format <> target_aspect_ratio
      or result.template_prompt_snapshot->>'higgsfield_resolution' <> target_resolution then
      raise exception 'Request already used for different settings';
    end if;
    return result;
  end if;
  -- Hold prices stable between quote verification and charging.
  perform 1 from public.video_resolution_pricing where resolution = target_resolution for share;
  perform 1 from public.video_templates where id = target_template_id for share;
  select q.credits_cost into actual_cost from public.get_video_pricing(target_template_id) q where q.resolution = target_resolution;
  if actual_cost is null then raise exception 'Video pricing unavailable'; end if;
  if expected_credits is distinct from actual_cost then raise exception 'Price changed. Review the updated cost and try again.'; end if;
  result := public.queue_video_project(target_workspace_id,target_listing_id,target_template_id,project_title,selected_photo_ids,target_aspect_ratio,target_resolution);
  update public.video_projects set creation_request_id = request_id where id = result.id returning * into result;
  return result;
end;
$$;
revoke all on function public.queue_video_project(bigint,bigint,bigint,text,bigint[],text,text) from public, anon, authenticated;
revoke all on function public.queue_priced_video_project(bigint,bigint,bigint,text,bigint[],text,text,integer,uuid) from public, anon;
grant execute on function public.queue_priced_video_project(bigint,bigint,bigint,text,bigint[],text,text,integer,uuid) to authenticated;
