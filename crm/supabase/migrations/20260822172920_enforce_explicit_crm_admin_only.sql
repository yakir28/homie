begin;

-- CRM authorization is an explicit allowlist. Workspace ownership alone must
-- never grant access to internal business data or administration workflows.
delete from public.crm_app_admins a
where not exists (
  select 1
  from auth.users u
  where u.id = a.user_id
    and lower(u.email) in ('supportbyhomie@gmail.com', 'yakir78111@gmail.com')
);

insert into public.crm_app_admins (user_id, role)
select u.id, case when lower(u.email) = 'supportbyhomie@gmail.com' then 'owner' else 'admin' end
from auth.users u
where lower(u.email) in ('supportbyhomie@gmail.com', 'yakir78111@gmail.com')
on conflict (user_id) do update set role = excluded.role;

alter table public.crm_app_admins
  drop constraint if exists crm_app_admins_role_check;
alter table public.crm_app_admins
  add constraint crm_app_admins_role_check check (role in ('owner', 'admin'));

create or replace function private.is_crm_admin(allowed_roles text[] default array['owner','admin'])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.crm_app_admins a
      where a.user_id = (select auth.uid())
        and a.role = any(allowed_roles)
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
as $$
  select private.is_crm_admin(array['owner','admin']);
$$;

revoke all on function public.crm_is_admin() from public, anon;
grant execute on function public.crm_is_admin() to authenticated;

commit;
