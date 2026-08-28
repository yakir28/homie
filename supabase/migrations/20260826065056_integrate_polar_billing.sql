-- Polar is the billing source of truth. The existing wallet remains Homie's
-- internal allowance ledger, with one unit representing one video generation.

alter table public.subscriptions
  drop constraint if exists subscriptions_provider_check;

alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('polar', 'stripe', 'manual'));

create table if not exists public.payment_webhook_events (
  id text primary key,
  provider text not null check (provider in ('polar')),
  event_type text not null,
  created_at timestamptz not null default now()
);

alter table public.payment_webhook_events enable row level security;
revoke all on public.payment_webhook_events from public, anon, authenticated;

update public.plans set is_active = false;

insert into public.plans (
  name, slug, audience, monthly_price, yearly_price,
  monthly_credits, seat_limit, features, is_active, sort_order
)
values
  ('Free Trial', 'free-trial', 'solo', 0, null, 1, 1,
    '["1 trial video","All video templates","No credit card required","7-day trial"]'::jsonb,
    true, 10),
  ('Starter', 'starter', 'solo', 29, null, 3, 1,
    '["3 video generations each month","All video templates","Zillow and Airbnb sync","Social-ready exports"]'::jsonb,
    true, 20),
  ('Pro', 'pro', 'solo', 59, null, 10, 1,
    '["10 video generations each month","Everything in Starter","Priority generation","Commercial usage"]'::jsonb,
    true, 30),
  ('Business', 'business', 'team', 149, null, 30, 10,
    '["30 video generations each month","Shared team workspace","10 agent seats","Priority support"]'::jsonb,
    true, 40)
on conflict (slug) do update set
  name = excluded.name,
  audience = excluded.audience,
  monthly_price = excluded.monthly_price,
  yearly_price = excluded.yearly_price,
  monthly_credits = excluded.monthly_credits,
  seat_limit = excluded.seat_limit,
  features = excluded.features,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

create or replace function public.sync_polar_subscription(
  event_id text,
  event_type text,
  target_workspace_id bigint,
  target_plan_slug text,
  polar_customer_id text,
  polar_subscription_id text,
  subscription_status text,
  billing_interval text,
  period_starts_at timestamptz,
  period_ends_at timestamptz,
  cancel_at_period_end boolean,
  grant_allowance boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_plan public.plans;
  existing_subscription public.subscriptions;
  inserted_event_id text;
  should_refresh_allowance boolean := false;
begin
  insert into public.payment_webhook_events (id, provider, event_type)
  values (event_id, 'polar', event_type)
  on conflict (id) do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then
    return;
  end if;

  select * into selected_plan
  from public.plans
  where slug = target_plan_slug and is_active = true;

  if selected_plan.id is null then
    raise exception 'Unknown active Homie plan: %', target_plan_slug;
  end if;

  select * into existing_subscription
  from public.subscriptions
  where workspace_id = target_workspace_id
  for update;

  should_refresh_allowance := grant_allowance and (
    existing_subscription.id is null
    or existing_subscription.provider_subscription_id is distinct from polar_subscription_id
    or existing_subscription.current_period_starts_at is distinct from period_starts_at
    or existing_subscription.status = 'trialing'
  );

  insert into public.subscriptions (
    workspace_id, plan_id, provider, provider_customer_id,
    provider_subscription_id, status, billing_interval,
    trial_ends_at, current_period_starts_at, current_period_ends_at,
    cancel_at_period_end
  )
  values (
    target_workspace_id, selected_plan.id, 'polar', polar_customer_id,
    polar_subscription_id, subscription_status, billing_interval,
    null, period_starts_at, period_ends_at, cancel_at_period_end
  )
  on conflict (workspace_id) do update set
    plan_id = excluded.plan_id,
    provider = excluded.provider,
    provider_customer_id = excluded.provider_customer_id,
    provider_subscription_id = excluded.provider_subscription_id,
    status = excluded.status,
    billing_interval = excluded.billing_interval,
    trial_ends_at = null,
    current_period_starts_at = excluded.current_period_starts_at,
    current_period_ends_at = excluded.current_period_ends_at,
    cancel_at_period_end = excluded.cancel_at_period_end,
    updated_at = now();

  if should_refresh_allowance then
    update public.credit_wallets
    set balance = selected_plan.monthly_credits,
        lifetime_credited = lifetime_credited + selected_plan.monthly_credits,
        updated_at = now()
    where workspace_id = target_workspace_id;

    insert into public.credit_ledger (
      workspace_id, amount, entry_type, description, idempotency_key
    ) values (
      target_workspace_id, selected_plan.monthly_credits, 'subscription',
      selected_plan.name || ' monthly video allowance',
      'polar-subscription:' || polar_subscription_id || ':period:' || period_starts_at::text
    ) on conflict (idempotency_key) do nothing;
  elsif subscription_status in ('paused', 'expired') then
    update public.credit_wallets
    set balance = 0, updated_at = now()
    where workspace_id = target_workspace_id;
  end if;
end;
$$;

revoke all on function public.sync_polar_subscription(
  text, text, bigint, text, text, text, text, text,
  timestamptz, timestamptz, boolean, boolean
) from public, anon, authenticated;
grant execute on function public.sync_polar_subscription(
  text, text, bigint, text, text, text, text, text,
  timestamptz, timestamptz, boolean, boolean
) to service_role;
