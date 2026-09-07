begin;

-- Keep the append-only ledger consistent with the corrected one-video wallet.
-- Legacy trial workspaces received +50; this records the corresponding -49
-- correction instead of rewriting their history.
insert into public.credit_ledger (
  workspace_id, amount, entry_type, description, idempotency_key
)
select
  wallets.workspace_id,
  wallets.balance - coalesce(ledger.total_amount, 0),
  'adjustment',
  'Correct legacy free trial allowance to one video',
  concat('workspace:', wallets.workspace_id, ':single-free-video-correction')
from public.credit_wallets wallets
join public.subscriptions subscriptions
  on subscriptions.workspace_id = wallets.workspace_id
join public.plans plans
  on plans.id = subscriptions.plan_id
left join lateral (
  select sum(entries.amount) as total_amount
  from public.credit_ledger entries
  where entries.workspace_id = wallets.workspace_id
) ledger on true
where plans.slug = 'free-trial'
  and wallets.balance <> coalesce(ledger.total_amount, 0)
on conflict (idempotency_key) do nothing;

commit;
