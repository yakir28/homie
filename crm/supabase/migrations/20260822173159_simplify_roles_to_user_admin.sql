begin;

-- Public app roles are intentionally limited to user/admin.
alter table public.workspace_members drop constraint if exists workspace_members_role_check;
alter table public.team_invitations drop constraint if exists team_invitations_role_check;
alter table public.crm_app_admins drop constraint if exists crm_app_admins_role_check;

update public.workspace_members wm
set role = case
  when exists (select 1 from public.crm_app_admins ca where ca.user_id = wm.user_id) then 'admin'
  else 'user'
end;
update public.team_invitations set role = case when role = 'admin' then 'admin' else 'user' end;
update public.crm_app_admins set role = 'admin';

alter table public.workspace_members alter column role set default 'user';
alter table public.workspace_members add constraint workspace_members_role_check check (role in ('user','admin'));
alter table public.team_invitations alter column role set default 'user';
alter table public.team_invitations add constraint team_invitations_role_check check (role in ('user','admin'));
alter table public.crm_app_admins add constraint crm_app_admins_role_check check (role = 'admin');

create or replace function private.is_workspace_admin(target_workspace_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role = 'admin'
  );
$$;
revoke all on function private.is_workspace_admin(bigint) from public, anon;
grant execute on function private.is_workspace_admin(bigint) to authenticated;

drop policy if exists workspaces_delete_owner on public.workspaces;
create policy workspaces_delete_admin on public.workspaces for delete to authenticated
using ((select private.is_workspace_admin(id)));

drop policy if exists members_delete_admin on public.workspace_members;
create policy members_delete_admin on public.workspace_members for delete to authenticated
using ((select private.is_workspace_admin(workspace_id)) and role <> 'admin');

create or replace function private.is_crm_admin(allowed_roles text[] default array['admin'])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.crm_app_admins a
    where a.user_id = (select auth.uid())
      and a.role = 'admin'
      and 'admin' = any(allowed_roles)
  );
$$;
revoke all on function private.is_crm_admin(text[]) from public, anon;
grant execute on function private.is_crm_admin(text[]) to authenticated;

create or replace function public.crm_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.is_crm_admin(array['admin']); $$;
revoke all on function public.crm_is_admin() from public, anon;
grant execute on function public.crm_is_admin() to authenticated;

create or replace function public.crm_update_workspace_role(target_user_id uuid,next_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare target_workspace_id bigint; current_role text;
begin
  if not private.is_crm_admin(array['admin']) then raise exception 'CRM admin access required'; end if;
  if next_role not in ('user','admin') then raise exception 'Invalid workspace role'; end if;
  select wm.workspace_id,wm.role into target_workspace_id,current_role
  from public.workspace_members wm where wm.user_id=target_user_id order by wm.joined_at limit 1;
  if target_workspace_id is null then raise exception 'User has no workspace membership'; end if;
  update public.workspace_members set role=next_role where workspace_id=target_workspace_id and user_id=target_user_id;
  insert into public.crm_admin_audit(actor_id,target_user_id,action,metadata)
  values ((select auth.uid()),target_user_id,'workspace_role_changed',jsonb_build_object('workspace_id',target_workspace_id,'from',current_role,'to',next_role));
  return next_role;
end;
$$;
revoke all on function public.crm_update_workspace_role(uuid,text) from public, anon;
grant execute on function public.crm_update_workspace_role(uuid,text) to authenticated;

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
  select wm.workspace_id into existing_workspace_id from public.workspace_members wm
  where wm.user_id=current_user_id order by wm.joined_at limit 1;
  if existing_workspace_id is not null then return existing_workspace_id; end if;
  insert into public.workspaces(name,slug,workspace_type,created_by)
  values(left(coalesce(nullif(trim(workspace_name),''),'My Homie Workspace'),120),'homie-'||replace(left(current_user_id::text,18),'-',''),'solo',current_user_id)
  returning id into new_workspace_id;
  insert into public.workspace_members(workspace_id,user_id,role) values(new_workspace_id,current_user_id,'user');
  insert into public.credit_wallets(workspace_id,balance,lifetime_credited) values(new_workspace_id,50,50);
  insert into public.subscriptions(workspace_id,plan_id,status,trial_ends_at)
  select new_workspace_id,p.id,'trialing',now()+interval '14 days' from public.plans p where p.slug='free-trial';
  insert into public.credit_ledger(workspace_id,amount,entry_type,description,idempotency_key,created_by)
  values(new_workspace_id,50,'trial','Free trial credits',concat('workspace:',new_workspace_id,':trial'),current_user_id);
  return new_workspace_id;
end;
$$;
revoke all on function public.bootstrap_workspace(text) from public, anon;
grant execute on function public.bootstrap_workspace(text) to authenticated;

commit;
