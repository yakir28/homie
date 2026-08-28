+create or replace function public.crm_dashboard_growth()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if not private.is_crm_admin() then raise exception 'CRM administrator access required'; end if;
  with months as (
    select generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') as month_start
  ), users_by_month as (
    select m.month_start,
      (select count(*) from auth.users u where u.created_at < m.month_start + interval '1 month') as total_users
    from months m
  ), mrr_by_month as (
    select m.month_start,
      coalesce((select sum(case when s.billing_interval='yearly' then coalesce(p.yearly_price,0)/12 else coalesce(p.monthly_price,0) end)
        from public.subscriptions s join public.plans p on p.id=s.plan_id
        where s.status in ('active','trialing') and s.created_at < m.month_start + interval '1 month'),0) as mrr
    from months m
  )
  select jsonb_build_object(
    'users', (select jsonb_agg(jsonb_build_object('month',to_char(month_start,'Mon'),'value',total_users) order by month_start) from users_by_month),
    'mrr', (select jsonb_agg(jsonb_build_object('month',to_char(month_start,'Mon'),'value',round(mrr,2)) order by month_start) from mrr_by_month)
  ) into result;
  return result;
end;
$$;
grant execute on function public.crm_dashboard_growth() to authenticated;
