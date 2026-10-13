-- /admin → Users: one row per account with plan, credits, usage, revenue and the
-- campaign that brought them, plus a per-user detail view. Admin-only.
-- Also makes account suspension real: suspended accounts can no longer queue videos.
begin;

create or replace function public.admin_list_users()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_crm_admin(array['admin']) then raise exception 'Admin access required'; end if;
  return (
    with base as (
      select u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at is not null email_confirmed,
        p.display_name, p.avatar_url, coalesce(p.account_status, 'active') account_status,
        exists (select 1 from public.crm_app_admins a where a.user_id = u.id) is_admin,
        (select w.id from public.workspaces w where w.created_by = u.id order by w.id limit 1) workspace_id,
        a.first_touch, a.last_touch
      from auth.users u
      left join public.profiles p on p.id = u.id
      left join public.user_attribution a on a.user_id = u.id
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id, 'email', b.email, 'name', b.display_name, 'avatar_url', b.avatar_url,
      'created_at', b.created_at, 'last_sign_in_at', b.last_sign_in_at, 'email_confirmed', b.email_confirmed,
      'status', b.account_status, 'is_admin', b.is_admin, 'workspace_id', b.workspace_id,
      'plan', pl.slug, 'plan_name', pl.name, 'subscription_status', s.status, 'billing_interval', s.billing_interval,
      'credits', coalesce(w.balance, 0),
      'videos', (select count(*) from public.video_projects v where v.created_by = b.id),
      'videos_completed', (select count(*) from public.video_projects v where v.created_by = b.id and v.status in ('awaiting_approval', 'approved')),
      'videos_failed', (select count(*) from public.video_projects v where v.created_by = b.id and v.status = 'failed'),
      'listings', (select count(*) from public.listings l where l.workspace_id = b.workspace_id),
      'intro_bought', exists (select 1 from public.polar_first_video_purchases f join public.polar_credit_orders o on o.id = f.order_id and o.paid where f.user_id = b.id),
      'revenue_cents',
        coalesce((select sum(round(o.net_amount::numeric * greatest(o.credits - o.refunded_credits, 0) / nullif(o.credits, 0))) from public.polar_credit_orders o where o.paid and o.workspace_id = b.workspace_id), 0)
        + coalesce((select sum(round(coalesce(m.monthly_price, y.yearly_price) * 100)) from public.credit_ledger l
            left join public.plans m on m.monthly_credits = l.amount and m.monthly_price > 0
            left join public.plans y on y.monthly_credits * 12 = l.amount and y.yearly_price > 0
            where l.entry_type = 'subscription' and l.workspace_id = b.workspace_id), 0),
      'source', coalesce(nullif(b.last_touch->>'utm_source', ''), nullif(b.first_touch->>'utm_source', ''),
        case when coalesce(b.last_touch->>'fbclid', b.first_touch->>'fbclid') is not null then 'meta' end,
        case when coalesce(b.last_touch->>'referrer', b.first_touch->>'referrer', '') <> '' then 'referral' end,
        case when b.first_touch is not null then 'direct' end),
      'campaign', coalesce(nullif(b.last_touch->>'utm_campaign', ''), nullif(b.first_touch->>'utm_campaign', ''))
    ) order by b.created_at desc), '[]'::jsonb)
    from base b
    left join public.subscriptions s on s.workspace_id = b.workspace_id
    left join public.plans pl on pl.id = s.plan_id
    left join public.credit_wallets w on w.workspace_id = b.workspace_id
  );
end;
$$;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_user_detail(target_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare target_workspace bigint;
begin
  if not private.is_crm_admin(array['admin']) then raise exception 'Admin access required'; end if;
  select w.id into target_workspace from public.workspaces w where w.created_by = target_user_id order by w.id limit 1;
  return jsonb_build_object(
    'attribution', (select jsonb_build_object('first_touch', a.first_touch, 'last_touch', a.last_touch, 'recorded_at', a.created_at)
      from public.user_attribution a where a.user_id = target_user_id),
    'videos', (select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'title', v.title, 'status', v.status, 'created_at', v.created_at,
        'duration_seconds', v.duration_seconds, 'credits', v.credits_cost, 'error', v.generation_error) order by v.created_at desc), '[]'::jsonb)
      from (select * from public.video_projects where created_by = target_user_id order by created_at desc limit 50) v),
    'ledger', (select coalesce(jsonb_agg(jsonb_build_object('created_at', l.created_at, 'amount', l.amount, 'type', l.entry_type, 'description', l.description) order by l.created_at desc), '[]'::jsonb)
      from (select * from public.credit_ledger where workspace_id = target_workspace order by created_at desc limit 50) l),
    'orders', (select coalesce(jsonb_agg(jsonb_build_object('created_at', o.created_at, 'credits', o.credits, 'net_cents', o.net_amount, 'paid', o.paid, 'refunded_credits', o.refunded_credits) order by o.created_at desc), '[]'::jsonb)
      from public.polar_credit_orders o where o.workspace_id = target_workspace),
    'audit', (select coalesce(jsonb_agg(jsonb_build_object('created_at', x.created_at, 'action', x.action, 'metadata', x.metadata) order by x.created_at desc), '[]'::jsonb)
      from (select c.* from public.crm_admin_audit c where c.target_user_id = admin_user_detail.target_user_id order by c.created_at desc limit 20) x)
  );
end;
$$;
revoke all on function public.admin_user_detail(uuid) from public, anon;
grant execute on function public.admin_user_detail(uuid) to authenticated;

-- Suspended accounts cannot start new generations.
do $migration$
declare
  definition text := pg_get_functiondef('public.queue_video_project(bigint,bigint,bigint,text,bigint[],text,text)'::regprocedure);
  anchor text := $anchor$  if current_user_id is null then raise exception 'Authentication required'; end if;$anchor$;
begin
  if (length(definition) - length(replace(definition, anchor, ''))) / length(anchor) <> 1 then
    raise exception 'Unexpected queue_video_project: auth check changed; inspect before migrating';
  end if;
  execute replace(definition, anchor, anchor || $gate$
  if exists (select 1 from public.profiles p where p.id = current_user_id and p.account_status = 'suspended') then
    raise exception 'This account is suspended. Contact supportbyhomie@gmail.com.';
  end if;$gate$);
end;
$migration$;

commit;
