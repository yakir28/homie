begin;

insert into public.crm_app_admins (user_id, role)
select distinct wm.user_id,
  case when wm.role = 'owner' then 'owner' else 'admin' end
from public.workspace_members wm
where wm.role in ('owner', 'admin')
on conflict (user_id) do update set role = excluded.role;

commit;
