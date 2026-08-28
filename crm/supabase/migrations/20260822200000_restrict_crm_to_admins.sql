+create or replace function public.crm_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.crm_app_admins
    where user_id = (select auth.uid())
      and role in ('owner','admin','support')
  );
$$;
revoke all on function public.crm_is_admin() from public, anon;
grant execute on function public.crm_is_admin() to authenticated;

drop policy if exists crm_contacts_member_select on public.crm_contacts;
drop policy if exists crm_contacts_member_insert on public.crm_contacts;
drop policy if exists crm_contacts_member_update on public.crm_contacts;
drop policy if exists crm_contacts_admin_delete on public.crm_contacts;
create policy crm_contacts_admin_select on public.crm_contacts for select to authenticated using ((select private.is_crm_admin()));
create policy crm_contacts_admin_insert on public.crm_contacts for insert to authenticated with check ((select private.is_crm_admin()) and created_by=(select auth.uid()));
create policy crm_contacts_admin_update on public.crm_contacts for update to authenticated using ((select private.is_crm_admin())) with check ((select private.is_crm_admin()));
create policy crm_contacts_admin_delete on public.crm_contacts for delete to authenticated using ((select private.is_crm_admin(array['owner','admin'])));

drop policy if exists crm_tasks_member_select on public.crm_tasks;
drop policy if exists crm_tasks_member_insert on public.crm_tasks;
drop policy if exists crm_tasks_member_update on public.crm_tasks;
drop policy if exists crm_tasks_admin_delete on public.crm_tasks;
create policy crm_tasks_admin_select on public.crm_tasks for select to authenticated using ((select private.is_crm_admin()));
create policy crm_tasks_admin_insert on public.crm_tasks for insert to authenticated with check ((select private.is_crm_admin()) and created_by=(select auth.uid()));
create policy crm_tasks_admin_update on public.crm_tasks for update to authenticated using ((select private.is_crm_admin())) with check ((select private.is_crm_admin()));
create policy crm_tasks_admin_delete on public.crm_tasks for delete to authenticated using ((select private.is_crm_admin(array['owner','admin'])));

drop policy if exists crm_resources_member_select on public.crm_resources;
drop policy if exists crm_resources_member_insert on public.crm_resources;
drop policy if exists crm_resources_member_update on public.crm_resources;
drop policy if exists crm_resources_admin_delete on public.crm_resources;
create policy crm_resources_admin_select on public.crm_resources for select to authenticated using ((select private.is_crm_admin()));
create policy crm_resources_admin_insert on public.crm_resources for insert to authenticated with check ((select private.is_crm_admin()) and created_by=(select auth.uid()));
create policy crm_resources_admin_update on public.crm_resources for update to authenticated using ((select private.is_crm_admin())) with check ((select private.is_crm_admin()));
create policy crm_resources_admin_delete on public.crm_resources for delete to authenticated using ((select private.is_crm_admin(array['owner','admin'])));

drop policy if exists crm_expenses_member_select on public.crm_expenses;
drop policy if exists crm_expenses_member_insert on public.crm_expenses;
drop policy if exists crm_expenses_member_update on public.crm_expenses;
drop policy if exists crm_expenses_admin_delete on public.crm_expenses;
create policy crm_expenses_admin_select on public.crm_expenses for select to authenticated using ((select private.is_crm_admin()));
create policy crm_expenses_admin_insert on public.crm_expenses for insert to authenticated with check ((select private.is_crm_admin()) and created_by=(select auth.uid()));
create policy crm_expenses_admin_update on public.crm_expenses for update to authenticated using ((select private.is_crm_admin())) with check ((select private.is_crm_admin()));
create policy crm_expenses_admin_delete on public.crm_expenses for delete to authenticated using ((select private.is_crm_admin(array['owner','admin'])));
