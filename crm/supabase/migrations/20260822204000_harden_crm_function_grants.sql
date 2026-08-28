revoke all on function public.crm_dashboard_growth() from public, anon;
grant execute on function public.crm_dashboard_growth() to authenticated;
revoke all on function public.crm_list_app_users() from public, anon;
grant execute on function public.crm_list_app_users() to authenticated;
revoke all on function public.crm_set_user_status(uuid,text,text) from public, anon;
grant execute on function public.crm_set_user_status(uuid,text,text) to authenticated;
