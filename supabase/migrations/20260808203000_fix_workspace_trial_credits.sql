begin;

create or replace function public.bootstrap_workspace(workspace_name text default 'My Homie Workspace')
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  existing_workspace_id bigint;
  new_workspace_id bigint;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select wm.workspace_id into existing_workspace_id
  from public.workspace_members wm
  where wm.user_id = current_user_id
  order by wm.joined_at
  limit 1;
  if existing_workspace_id is not null then return existing_workspace_id; end if;

  insert into public.workspaces (name, slug, workspace_type, created_by)
  values (
    left(coalesce(nullif(trim(workspace_name), ''), 'My Homie Workspace'), 120),
    'homie-' || replace(left(current_user_id::text, 18), '-', ''),
    'solo', current_user_id
  ) returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, current_user_id, 'owner');

  insert into public.credit_wallets (workspace_id, balance, lifetime_credited)
  values (new_workspace_id, 50, 50);

  insert into public.subscriptions (workspace_id, plan_id, status, trial_ends_at)
  select new_workspace_id, p.id, 'trialing', now() + interval '14 days'
  from public.plans p where p.slug = 'free-trial';

  insert into public.credit_ledger (
    workspace_id, amount, entry_type, description, idempotency_key, created_by
  ) values (
    new_workspace_id, 50, 'trial', 'Free trial credits',
    concat('workspace:', new_workspace_id, ':trial'), current_user_id
  );

  return new_workspace_id;
end;
$$;

revoke all on function public.bootstrap_workspace(text) from public, anon;
grant execute on function public.bootstrap_workspace(text) to authenticated;

commit;
