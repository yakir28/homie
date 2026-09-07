begin;

-- A trial belongs to an auth user, not to a disposable workspace. Keeping this
-- record in the private schema prevents clients from resetting or editing it.
create table if not exists private.user_video_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_workspace_id bigint not null,
  granted_at timestamptz not null default now(),
  used_at timestamptz,
  video_project_id bigint
);

revoke all on table private.user_video_trials from public, anon, authenticated;

-- Preserve trial history for existing accounts before correcting their wallets.
insert into private.user_video_trials (
  user_id, granted_workspace_id, granted_at, used_at, video_project_id
)
select distinct on (members.user_id)
  members.user_id,
  members.workspace_id,
  members.joined_at,
  first_video.created_at,
  first_video.id
from public.workspace_members members
join public.subscriptions subscriptions
  on subscriptions.workspace_id = members.workspace_id
join public.plans plans
  on plans.id = subscriptions.plan_id
left join lateral (
  select projects.id, projects.created_at
  from public.video_projects projects
  where projects.workspace_id = members.workspace_id
    and projects.created_by = members.user_id
  order by projects.created_at, projects.id
  limit 1
) first_video on true
where plans.slug = 'free-trial'
order by members.user_id, members.joined_at, members.workspace_id
on conflict (user_id) do nothing;

update public.plans
set monthly_credits = 1,
    updated_at = now()
where slug = 'free-trial';

-- Repair legacy trial wallets that were created with 50 credits. A workspace
-- with any generated project has already consumed its one free video.
update public.credit_wallets wallets
set balance = case
      when exists (
        select 1
        from public.video_projects projects
        where projects.workspace_id = wallets.workspace_id
      ) then 0
      else least(wallets.balance, 1)
    end,
    lifetime_credited = greatest(
      wallets.lifetime_spent + case
        when exists (
          select 1
          from public.video_projects projects
          where projects.workspace_id = wallets.workspace_id
        ) then 0
        else least(wallets.balance, 1)
      end,
      1
    ),
    updated_at = now()
from public.subscriptions subscriptions
join public.plans plans on plans.id = subscriptions.plan_id
where subscriptions.workspace_id = wallets.workspace_id
  and plans.slug = 'free-trial';

create or replace function public.bootstrap_workspace(
  workspace_name text default 'My Homie Workspace'
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  existing_workspace_id bigint;
  new_workspace_id bigint;
  trial_was_granted boolean := false;
  initial_balance integer := 0;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  -- Serialize bootstrap calls for this user so two simultaneous requests cannot
  -- create two workspaces or two trial grants.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  select members.workspace_id into existing_workspace_id
  from public.workspace_members members
  where members.user_id = current_user_id
  order by members.joined_at
  limit 1;

  if existing_workspace_id is not null then return existing_workspace_id; end if;

  insert into public.workspaces (name, slug, workspace_type, created_by)
  values (
    left(coalesce(nullif(trim(workspace_name), ''), 'My Homie Workspace'), 120),
    'homie-' || replace(left(current_user_id::text, 18), '-', ''),
    'solo', current_user_id
  ) returning id into new_workspace_id;

  -- Omit role so each schema version uses its own safe non-admin default.
  insert into public.workspace_members (workspace_id, user_id)
  values (new_workspace_id, current_user_id);

  insert into private.user_video_trials (user_id, granted_workspace_id)
  values (current_user_id, new_workspace_id)
  on conflict (user_id) do nothing
  returning true into trial_was_granted;

  initial_balance := case when coalesce(trial_was_granted, false) then 1 else 0 end;

  insert into public.credit_wallets (workspace_id, balance, lifetime_credited)
  values (new_workspace_id, initial_balance, initial_balance);

  insert into public.subscriptions (workspace_id, plan_id, status, trial_ends_at)
  select new_workspace_id, plans.id, 'trialing', now() + interval '7 days'
  from public.plans plans
  where plans.slug = 'free-trial';

  if initial_balance = 1 then
    insert into public.credit_ledger (
      workspace_id, amount, entry_type, description, idempotency_key, created_by
    ) values (
      new_workspace_id, 1, 'trial', 'Free trial video generation',
      concat('user:', current_user_id, ':trial'), current_user_id
    );
  end if;

  return new_workspace_id;
end;
$$;

revoke all on function public.bootstrap_workspace(text) from public, anon, authenticated;
grant execute on function public.bootstrap_workspace(text) to authenticated;

-- Remove the obsolete overload so it cannot bypass the current validation path.
drop function if exists public.queue_video_project(
  bigint, bigint, bigint, text, bigint[]
);

create or replace function public.queue_video_project(
  target_workspace_id bigint,
  target_listing_id bigint,
  target_template_id bigint,
  project_title text,
  selected_photo_ids bigint[],
  target_aspect_ratio text,
  target_resolution text
)
returns public.video_projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_plan_slug text;
  claimed_trial_user_id uuid;
  selected_template public.video_templates;
  created_project public.video_projects;
  selected_count integer;
  selected_recipe jsonb;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if not private.is_workspace_member(target_workspace_id) then raise exception 'Workspace access denied'; end if;
  if target_aspect_ratio not in ('9:16', '16:9', '1:1', '4:3', '3:4', '21:9') then raise exception 'Unsupported aspect ratio'; end if;
  if target_resolution not in ('480p', '720p', '1080p', '4k') then raise exception 'Unsupported resolution'; end if;
  if not exists (
    select 1 from public.listings
    where id = target_listing_id and workspace_id = target_workspace_id
  ) then raise exception 'Listing not found in this workspace'; end if;

  select plans.slug into current_plan_slug
  from public.subscriptions subscriptions
  join public.plans plans on plans.id = subscriptions.plan_id
  where subscriptions.workspace_id = target_workspace_id;

  if current_plan_slug is null then raise exception 'Workspace subscription is missing'; end if;

  select * into selected_template
  from public.video_templates
  where id = target_template_id and is_active = true;
  if not found then raise exception 'Template is unavailable'; end if;
  if selected_template.duration_seconds > 30 then raise exception 'Seedance templates cannot exceed 30 seconds'; end if;

  selected_count := coalesce(array_length(selected_photo_ids, 1), 0);
  if selected_count < selected_template.min_photos or selected_count > selected_template.max_photos then
    raise exception 'Select between % and % photos', selected_template.min_photos, selected_template.max_photos;
  end if;
  if selected_count <> (
    select count(distinct photos.id)
    from public.listing_photos photos
    where photos.listing_id = target_listing_id
      and photos.id = any(selected_photo_ids)
  ) then raise exception 'One or more photos do not belong to this listing'; end if;

  -- This update is the per-user, concurrency-safe free-video claim. If another
  -- request won the race, zero rows are updated and this request is rejected.
  if current_plan_slug = 'free-trial' then
    update private.user_video_trials
    set used_at = now()
    where user_id = current_user_id
      and granted_workspace_id = target_workspace_id
      and used_at is null
    returning user_id into claimed_trial_user_id;

    if claimed_trial_user_id is null then
      raise exception 'Free trial video already used';
    end if;
  end if;

  update public.credit_wallets
  set balance = balance - selected_template.credits_cost,
      lifetime_spent = lifetime_spent + selected_template.credits_cost,
      updated_at = now()
  where workspace_id = target_workspace_id
    and balance >= selected_template.credits_cost;
  if not found then raise exception 'Not enough video generations available'; end if;

  selected_recipe := selected_template.generation_config || jsonb_build_object(
    'provider', 'higgsfield',
    'higgsfield_model', 'seedance_2_0',
    'higgsfield_resolution', target_resolution,
    'selected_aspect_ratio', target_aspect_ratio,
    'template_duration_seconds', selected_template.duration_seconds
  );

  insert into public.video_projects (
    workspace_id, listing_id, template_id, created_by, title, status,
    output_format, duration_seconds, credits_cost, template_prompt_snapshot
  ) values (
    target_workspace_id, target_listing_id, target_template_id, current_user_id,
    left(coalesce(nullif(trim(project_title), ''), selected_template.name), 200),
    'queued', target_aspect_ratio, selected_template.duration_seconds,
    selected_template.credits_cost, selected_recipe
  ) returning * into created_project;

  insert into public.video_project_photos (
    video_project_id, listing_photo_id, sort_order
  )
  select created_project.id, photo_id, ordinality - 1
  from unnest(selected_photo_ids) with ordinality as picked(photo_id, ordinality);

  insert into public.credit_ledger (
    workspace_id, video_project_id, amount, entry_type,
    description, idempotency_key, created_by
  ) values (
    target_workspace_id, created_project.id, -selected_template.credits_cost,
    'generation', concat('Video generation: ', created_project.title),
    concat('video-project:', created_project.id, ':generation'), current_user_id
  );

  if current_plan_slug = 'free-trial' then
    update private.user_video_trials
    set video_project_id = created_project.id
    where user_id = current_user_id;
  end if;

  return created_project;
end;
$$;

revoke all on function public.queue_video_project(
  bigint, bigint, bigint, text, bigint[], text, text
) from public, anon, authenticated;
grant execute on function public.queue_video_project(
  bigint, bigint, bigint, text, bigint[], text, text
) to authenticated;

commit;
