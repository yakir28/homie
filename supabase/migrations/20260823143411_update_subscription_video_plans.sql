-- Customers buy video generations, not abstract credits. The existing wallet
-- remains the atomic accounting mechanism: one wallet unit now equals one
-- generated video, including a regeneration.

update public.video_templates
set credits_cost = 1;

update public.plans
set is_active = false
where slug not in ('free-trial', 'solo-agent', 'pro-agent', 'office-team');

insert into public.plans (
  name, slug, audience, monthly_price, yearly_price,
  monthly_credits, seat_limit, features, is_active, sort_order
)
values
  ('Free Trial', 'free-trial', 'solo', 0, 0, 1, 1,
    '["1 watermarked trial video","All video templates","No credit card required","7-day trial"]'::jsonb,
    true, 10),
  ('Agent', 'solo-agent', 'solo', 149, 1490, 10, 1,
    '["10 video generations each month","All video templates","Zillow and Airbnb sync","Social-ready exports"]'::jsonb,
    true, 20),
  ('Pro Agent', 'pro-agent', 'solo', 299, 2990, 25, 2,
    '["25 video generations each month","Everything in Agent","2 agent seats","Priority generation"]'::jsonb,
    true, 30),
  ('Team', 'office-team', 'team', 699, 6990, 60, 10,
    '["60 video generations each month","Shared team workspace","Brand-consistent templates","Priority support"]'::jsonb,
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

-- Bring unused trial balances into the new one-video model without changing
-- paid or manually adjusted wallets.
update public.credit_wallets wallets
set balance = least(wallets.balance, 1),
    lifetime_credited = greatest(wallets.lifetime_spent + least(wallets.balance, 1), wallets.lifetime_credited),
    updated_at = now()
from public.subscriptions subscriptions
join public.plans plans on plans.id = subscriptions.plan_id
where subscriptions.workspace_id = wallets.workspace_id
  and plans.slug = 'free-trial'
  and wallets.lifetime_spent = 0;

update public.subscriptions subscriptions
set trial_ends_at = least(subscriptions.trial_ends_at, subscriptions.created_at + interval '7 days'),
    updated_at = now()
from public.plans plans
where plans.id = subscriptions.plan_id
  and plans.slug = 'free-trial'
  and subscriptions.status = 'trialing';
