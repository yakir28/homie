begin;

update public.plans
set yearly_price = case slug
      when 'starter' then 490
      when 'pro' then 1290
      when 'business' then 3490
    end,
    updated_at = now()
where slug in ('starter', 'pro', 'business');

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
  allowance_amount integer;
begin
  if billing_interval not in ('monthly', 'yearly') then
    raise exception 'Unsupported billing interval: %', billing_interval;
  end if;

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

  allowance_amount := selected_plan.monthly_credits * case when billing_interval = 'yearly' then 12 else 1 end;

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
    set balance = allowance_amount,
        lifetime_credited = lifetime_credited + allowance_amount,
        updated_at = now()
    where workspace_id = target_workspace_id;

    insert into public.credit_ledger (
      workspace_id, amount, entry_type, description, idempotency_key
    ) values (
      target_workspace_id, allowance_amount, 'subscription',
      selected_plan.name || case when billing_interval = 'yearly' then ' annual video allowance' else ' monthly video allowance' end,
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

commit;
