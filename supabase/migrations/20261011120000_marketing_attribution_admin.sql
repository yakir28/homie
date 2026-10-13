-- Marketing attribution and the /admin dashboard.
-- user_attribution: where each user came from (first and last touch before signup).
-- ad_spend: daily Meta spend per campaign/ad set/ad, entered manually or from CSV.
-- All reads go through admin-only security definer functions; clients never read the tables.
begin;

create table if not exists public.user_attribution (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_touch jsonb not null default '{}'::jsonb,
  last_touch jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.user_attribution enable row level security;
revoke all on table public.user_attribution from public, anon, authenticated;

create table if not exists public.ad_spend (
  id bigint generated always as identity primary key,
  spend_date date not null,
  platform text not null default 'meta' check (platform in ('meta', 'google', 'tiktok', 'other')),
  campaign text not null check (char_length(campaign) between 1 and 300),
  adset text not null default '',
  ad text not null default '',
  amount_cents integer not null check (amount_cents >= 0),
  impressions integer check (impressions >= 0),
  clicks integer check (clicks >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (spend_date, platform, campaign, adset, ad)
);
alter table public.ad_spend enable row level security;
revoke all on table public.ad_spend from public, anon, authenticated;

-- Keep only known marketing fields, as short strings.
create or replace function private.clean_touch(touch jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(key, left(value #>> '{}', 500)), '{}'::jsonb)
  from jsonb_each(case when jsonb_typeof(touch) = 'object' then touch else '{}'::jsonb end)
  where key in ('utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
                'fbclid', 'gclid', 'ttclid', 'referrer', 'landing_path', 'seen_at')
    and jsonb_typeof(value) = 'string' and value #>> '{}' <> '';
$$;

-- Called by the app once after signup. First write wins; later calls are ignored.
create or replace function public.record_signup_attribution(first_touch jsonb, last_touch jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.user_attribution (user_id, first_touch, last_touch)
  values (auth.uid(), private.clean_touch(first_touch), private.clean_touch(last_touch))
  on conflict (user_id) do nothing;
end;
$$;
revoke all on function public.record_signup_attribution(jsonb, jsonb) from public, anon;
grant execute on function public.record_signup_attribution(jsonb, jsonb) to authenticated;

create or replace function public.admin_upsert_ad_spend(rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare saved integer;
begin
  if not private.is_crm_admin(array['admin']) then raise exception 'Admin access required'; end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 5000 then raise exception 'Send 1–5,000 spend rows'; end if;
  insert into public.ad_spend as s (spend_date, platform, campaign, adset, ad, amount_cents, impressions, clicks, created_by)
  select (r->>'spend_date')::date, coalesce(nullif(r->>'platform', ''), 'meta'), btrim(r->>'campaign'),
         coalesce(btrim(r->>'adset'), ''), coalesce(btrim(r->>'ad'), ''), round((r->>'amount')::numeric * 100)::integer,
         nullif(r->>'impressions', '')::integer, nullif(r->>'clicks', '')::integer, auth.uid()
  from jsonb_array_elements(rows) r
  on conflict (spend_date, platform, campaign, adset, ad) do update set
    amount_cents = excluded.amount_cents, impressions = excluded.impressions, clicks = excluded.clicks, updated_at = now();
  get diagnostics saved = row_count;
  return saved;
end;
$$;
revoke all on function public.admin_upsert_ad_spend(jsonb) from public, anon;
grant execute on function public.admin_upsert_ad_spend(jsonb) to authenticated;

create or replace function public.admin_delete_ad_spend(target_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_crm_admin(array['admin']) then raise exception 'Admin access required'; end if;
  delete from public.ad_spend where id = target_id;
end;
$$;
revoke all on function public.admin_delete_ad_spend(bigint) from public, anon;
grant execute on function public.admin_delete_ad_spend(bigint) to authenticated;

-- One report for the dashboard. Users are attributed to their last touch before
-- signup, falling back to first touch; admins are excluded from every number.
create or replace function public.admin_marketing_stats(from_date date, to_date date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  range_start timestamptz := from_date::timestamptz;
  range_end timestamptz := (to_date + 1)::timestamptz;
  result jsonb;
begin
  if not private.is_crm_admin(array['admin']) then raise exception 'Admin access required'; end if;
  if from_date is null or to_date is null or to_date < from_date or to_date - from_date > 400 then
    raise exception 'Choose a date range of up to 400 days';
  end if;

  with users as (
    select u.id user_id, u.created_at signed_up_at,
      (select w.id from public.workspaces w where w.created_by = u.id order by w.id limit 1) workspace_id,
      coalesce(nullif(a.last_touch->>'utm_source', ''), nullif(a.first_touch->>'utm_source', ''),
        case when coalesce(a.last_touch->>'fbclid', a.first_touch->>'fbclid') is not null then 'meta' end,
        case when coalesce(a.last_touch->>'referrer', a.first_touch->>'referrer', '') <> '' then 'referral' end, 'direct') source,
      coalesce(nullif(a.last_touch->>'utm_campaign', ''), nullif(a.first_touch->>'utm_campaign', ''), '(none)') campaign,
      coalesce(nullif(a.last_touch->>'utm_term', ''), nullif(a.first_touch->>'utm_term', ''), '') adset,
      coalesce(nullif(a.last_touch->>'utm_content', ''), nullif(a.first_touch->>'utm_content', ''), '') ad
    from auth.users u
    left join public.user_attribution a on a.user_id = u.id
    where not exists (select 1 from public.crm_app_admins admins where admins.user_id = u.id)
  ),
  intro as (
    select f.user_id, min(o.created_at) bought_at
    from public.polar_first_video_purchases f
    join public.polar_credit_orders o on o.id = f.order_id and o.paid
    group by f.user_id
  ),
  orders as (
    select o.workspace_id, o.created_at,
      round(o.net_amount::numeric * greatest(o.credits - o.refunded_credits, 0) / nullif(o.credits, 0))::bigint revenue_cents
    from public.polar_credit_orders o where o.paid
  ),
  sub_payments as (
    select l.workspace_id, l.created_at, round(coalesce(m.monthly_price, y.yearly_price) * 100)::bigint revenue_cents
    from public.credit_ledger l
    left join public.plans m on m.monthly_credits = l.amount and m.monthly_price > 0
    left join public.plans y on y.monthly_credits * 12 = l.amount and y.yearly_price > 0
    where l.entry_type = 'subscription'
  ),
  payments as (
    select * from orders union all select * from sub_payments
  ),
  videos as (
    select p.created_by user_id, p.created_at, p.status,
      coalesce((v.provider_metadata->>'generated_seconds')::numeric, p.duration_seconds) seconds,
      coalesce(p.template_prompt_snapshot->>'higgsfield_resolution', '720p') resolution
    from public.video_projects p
    left join public.video_versions v on v.video_project_id = p.id and v.version_number = 1
  ),
  cohort as (
    select u.*,
      i.bought_at is not null bought_intro,
      exists (select 1 from videos v where v.user_id = u.user_id and v.status in ('awaiting_approval', 'approved')) completed_video,
      exists (select 1 from sub_payments s where s.workspace_id = u.workspace_id) subscribed,
      coalesce((select sum(p.revenue_cents) from payments p where p.workspace_id = u.workspace_id), 0) revenue_cents
    from users u left join intro i on i.user_id = u.user_id
    where u.signed_up_at >= range_start and u.signed_up_at < range_end
  ),
  spend as (
    select campaign, sum(amount_cents) spend_cents, sum(impressions) impressions, sum(clicks) clicks
    from public.ad_spend where spend_date between from_date and to_date group by campaign
  ),
  campaigns as (
    select coalesce(c.source, 'meta') source, coalesce(c.campaign, s.campaign) campaign,
      coalesce(c.signups, 0) signups, coalesce(c.intro, 0) intro_purchases, coalesce(c.videos, 0) completed_videos,
      coalesce(c.subs, 0) subscriptions, coalesce(c.revenue, 0) revenue_cents,
      coalesce(s.spend_cents, 0) spend_cents, s.impressions, s.clicks
    from (
      select source, campaign, count(*) signups, count(*) filter (where bought_intro) intro,
        count(*) filter (where completed_video) videos, count(*) filter (where subscribed) subs, sum(revenue_cents) revenue
      from cohort group by source, campaign
    ) c
    full join spend s on s.campaign = c.campaign
  ),
  days as (
    select d::date as day from generate_series(from_date, to_date, interval '1 day') d
  )
  select jsonb_build_object(
    'range', jsonb_build_object('from', from_date, 'to', to_date),
    'totals', (select jsonb_build_object(
        'signups', count(*),
        'intro_purchases', count(*) filter (where bought_intro),
        'completed_videos', count(*) filter (where completed_video),
        'subscriptions', count(*) filter (where subscribed),
        'cohort_revenue_cents', coalesce(sum(revenue_cents), 0)) from cohort),
    'revenue_in_range_cents', (select coalesce(sum(p.revenue_cents), 0) from payments p
        where p.created_at >= range_start and p.created_at < range_end
          and p.workspace_id not in (select w.id from public.workspaces w join public.crm_app_admins a on a.user_id = w.created_by)),
    'spend_cents', (select coalesce(sum(amount_cents), 0) from public.ad_spend where spend_date between from_date and to_date),
    'active_subscriptions', (select count(*) from public.subscriptions s join public.plans p on p.id = s.plan_id
        where p.slug in ('starter', 'pro', 'business') and s.status in ('active', 'past_due')
          and s.workspace_id not in (select w.id from public.workspaces w join public.crm_app_admins a on a.user_id = w.created_by)),
    'mrr_cents', (select coalesce(sum(round(case when s.billing_interval = 'yearly' then p.yearly_price / 12 else p.monthly_price end * 100)), 0)
        from public.subscriptions s join public.plans p on p.id = s.plan_id
        where p.slug in ('starter', 'pro', 'business') and s.status in ('active', 'past_due')
          and s.workspace_id not in (select w.id from public.workspaces w join public.crm_app_admins a on a.user_id = w.created_by)),
    'generation', (select jsonb_build_object(
        'videos', count(*),
        'seconds', coalesce(sum(seconds), 0),
        'est_cost_cents', coalesce(round(sum(seconds * case when resolution in ('1080p', '4k') then 23.8 else 11.9 end)), 0))
      from videos v where v.created_at >= range_start and v.created_at < range_end and v.status in ('awaiting_approval', 'approved')
        and v.user_id not in (select user_id from public.crm_app_admins)),
    'campaigns', (select coalesce(jsonb_agg(to_jsonb(c) order by c.spend_cents desc, c.signups desc), '[]'::jsonb) from campaigns c),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day,
        'signups', (select count(*) from cohort c where c.signed_up_at::date = d.day),
        'intro_purchases', (select count(*) from intro i join users u on u.user_id = i.user_id where i.bought_at::date = d.day),
        'revenue_cents', (select coalesce(sum(p.revenue_cents), 0) from payments p where p.created_at::date = d.day
          and p.workspace_id not in (select w.id from public.workspaces w join public.crm_app_admins a on a.user_id = w.created_by)),
        'spend_cents', (select coalesce(sum(amount_cents), 0) from public.ad_spend s where s.spend_date = d.day)
      ) order by d.day), '[]'::jsonb) from days d),
    'spend_rows', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'day', spend_date, 'campaign', campaign, 'adset', adset, 'ad', ad,
        'amount_cents', amount_cents, 'impressions', impressions, 'clicks', clicks) order by spend_date desc, campaign), '[]'::jsonb)
      from (select * from public.ad_spend where spend_date between from_date and to_date order by spend_date desc limit 500) r)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_marketing_stats(date, date) from public, anon;
grant execute on function public.admin_marketing_stats(date, date) to authenticated;

commit;
