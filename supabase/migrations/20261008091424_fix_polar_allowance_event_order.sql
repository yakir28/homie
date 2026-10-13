begin;
alter table public.subscriptions add column if not exists polar_event_at timestamptz;
drop function if exists public.sync_polar_subscription(text,text,bigint,text,text,text,text,text,timestamptz,timestamptz,boolean,boolean);

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
  grant_allowance boolean,
  event_occurred_at timestamptz
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
  granted_allowance_key text;
  allowance_amount integer;
begin
  if billing_interval not in ('monthly', 'yearly') then
    raise exception 'Unsupported billing interval: %', billing_interval;
  end if;

  if event_occurred_at is null or period_starts_at is null or period_ends_at is null
     or period_ends_at <= period_starts_at then raise exception 'Invalid billing timestamps'; end if;

  -- Serialize even the first subscription event for a workspace.
  perform 1 from public.workspaces where id = target_workspace_id for update;
  if not found then raise exception 'Workspace not found'; end if;
  perform 1 from public.credit_wallets where workspace_id = target_workspace_id for update;
  if not found then raise exception 'Wallet not found'; end if;

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

  if existing_subscription.polar_event_at is not null
     and event_occurred_at < existing_subscription.polar_event_at then return; end if;

  -- Subscription snapshots can arrive before the event that grants the allowance.
  -- The ledger, not the latest subscription snapshot, records whether it was granted.
  should_refresh_allowance := grant_allowance and subscription_status = 'active';

  insert into public.subscriptions (
    workspace_id, plan_id, provider, provider_customer_id,
    provider_subscription_id, status, billing_interval,
    trial_ends_at, current_period_starts_at, current_period_ends_at,
    cancel_at_period_end, polar_event_at
  )
  values (
    target_workspace_id, selected_plan.id, 'polar', polar_customer_id,
    polar_subscription_id, subscription_status, billing_interval,
    null, period_starts_at, period_ends_at, cancel_at_period_end, event_occurred_at
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
    polar_event_at = excluded.polar_event_at,
    updated_at = now();

  if should_refresh_allowance then
    insert into public.credit_ledger (
      workspace_id, amount, entry_type, description, idempotency_key
    ) values (
      target_workspace_id, allowance_amount, 'subscription',
      selected_plan.name || case when billing_interval = 'yearly' then ' annual video allowance' else ' monthly video allowance' end,
      'polar-subscription:' || polar_subscription_id || ':period:' || period_starts_at::text
    ) on conflict (idempotency_key) do nothing
    returning idempotency_key into granted_allowance_key;

    if granted_allowance_key is not null then
    update public.credit_wallets
    set balance = allowance_amount,
        lifetime_credited = lifetime_credited + allowance_amount,
        updated_at = now()
    where workspace_id = target_workspace_id;

    end if;
  elsif subscription_status in ('paused', 'expired') then
    update public.credit_wallets
    set balance = 0, updated_at = now()
    where workspace_id = target_workspace_id;
  end if;
end;
$$;

revoke all on function public.sync_polar_subscription(
  text, text, bigint, text, text, text, text, text,
  timestamptz, timestamptz, boolean, boolean, timestamptz
) from public, anon, authenticated;
grant execute on function public.sync_polar_subscription(
  text, text, bigint, text, text, text, text, text,
  timestamptz, timestamptz, boolean, boolean, timestamptz
) to service_role;

commit;
