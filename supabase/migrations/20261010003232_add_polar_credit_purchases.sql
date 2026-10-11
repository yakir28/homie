begin;
alter table public.credit_wallets add column purchased_balance integer not null default 0 check(purchased_balance >= 0);
alter table public.credit_wallets add column purchase_refund_debt integer not null default 0 check(purchase_refund_debt >= 0);
alter table public.credit_wallets add constraint wallet_purchased_within_balance check(purchased_balance <= balance);

create table public.polar_credit_orders (
 id text primary key, workspace_id bigint not null references public.workspaces(id),
 product_id text not null, credits integer not null check(credits>0), net_amount integer not null check(net_amount>0),
 paid boolean not null default false, refunded_credits integer not null default 0,
 granted boolean not null default false, revoked_credits integer not null default 0,
 created_at timestamptz not null default now()
);
alter table public.polar_credit_orders enable row level security;
revoke all on public.polar_credit_orders from public, anon, authenticated;

-- All generation paths debit this wallet. Spend allowance before bought credits.
create function public.track_purchased_credit_spend() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.balance < old.balance and new.purchased_balance = old.purchased_balance then
   new.purchased_balance := least(old.purchased_balance,new.balance);
 end if;
 return new;
end; $$;
create trigger track_purchased_credit_spend before update on public.credit_wallets
for each row execute function public.track_purchased_credit_spend();

create function public.fulfill_polar_credit_order(order_id text,target_workspace_id bigint,product_id text,
 credits integer,net_amount integer,refunded_amount integer,is_paid boolean)
returns void language plpgsql security definer set search_path='' as $$
declare o public.polar_credit_orders; w public.credit_wallets; refund_delta integer; removed integer; added integer; debt_paid integer;
begin
 if credits not in (60,150,300,600) or net_amount <> (case credits when 60 then 2200 when 150 then 4900 when 300 then 9900 when 600 then 19500 end)
   or refunded_amount is null or refunded_amount < 0 or is_paid is null then raise exception 'Invalid purchase'; end if;
 perform 1 from public.workspaces where id=target_workspace_id for update;
 if not found then raise exception 'Workspace not found'; end if;
 select * into w from public.credit_wallets where workspace_id=target_workspace_id for update;
 if not found then raise exception 'Wallet not found'; end if;
 insert into public.polar_credit_orders(id,workspace_id,product_id,credits,net_amount)
 values(order_id,target_workspace_id,product_id,credits,net_amount) on conflict(id) do nothing;
 select * into o from public.polar_credit_orders where id=order_id for update;
 if o.workspace_id <> target_workspace_id or o.product_id <> product_id or o.credits <> credits or o.net_amount <> net_amount then raise exception 'Order mapping changed'; end if;
 o.paid := o.paid or is_paid;
 o.refunded_credits := greatest(o.refunded_credits,least(credits,ceil(credits::numeric*refunded_amount/net_amount)::integer));
 -- A refund may arrive before payment; record it without granting anything.
 if o.paid and not o.granted then
   added := credits-o.refunded_credits;
   debt_paid := least(added,w.purchase_refund_debt);
   added := added-debt_paid;
   update public.credit_wallets set balance=balance+added,purchased_balance=purchased_balance+added,
     purchase_refund_debt=purchase_refund_debt-debt_paid,lifetime_credited=lifetime_credited+added,updated_at=now()
   where workspace_id=target_workspace_id;
   if added>0 then insert into public.credit_ledger(workspace_id,amount,entry_type,description,idempotency_key)
     values(target_workspace_id,added,'top_up','Polar credit purchase','polar-order:'||order_id); end if;
   o.granted := true; o.revoked_credits := o.refunded_credits;
 elsif o.granted and o.refunded_credits>o.revoked_credits then
   refund_delta := o.refunded_credits-o.revoked_credits;
   removed := least(w.purchased_balance,refund_delta);
   update public.credit_wallets set balance=balance-removed,purchased_balance=purchased_balance-removed,
     purchase_refund_debt=purchase_refund_debt+refund_delta-removed,updated_at=now() where workspace_id=target_workspace_id;
   if removed>0 then insert into public.credit_ledger(workspace_id,amount,entry_type,description,idempotency_key)
     values(target_workspace_id,-removed,'adjustment','Refunded Polar purchase','polar-order:'||order_id||':refund:'||o.refunded_credits); end if;
   o.revoked_credits := o.refunded_credits;
 end if;
 update public.polar_credit_orders set paid=o.paid,refunded_credits=o.refunded_credits,granted=o.granted,revoked_credits=o.revoked_credits where id=order_id;
end; $$;
revoke all on function public.fulfill_polar_credit_order(text,bigint,text,integer,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.fulfill_polar_credit_order(text,bigint,text,integer,integer,integer,boolean) to service_role;

-- Renewals replace only the subscription allowance, never purchased credits.
do $$ declare d text; begin
 d := pg_get_functiondef('public.sync_polar_subscription(text,text,bigint,text,text,text,text,text,timestamptz,timestamptz,boolean,boolean,timestamptz)'::regprocedure);
 if position('balance = allowance_amount' in d)=0 or position('balance = 0' in d)=0 then raise exception 'Unexpected subscription function'; end if;
 d := replace(d,'balance = allowance_amount','balance = purchased_balance + allowance_amount');
 d := replace(d,'balance = 0','balance = purchased_balance');
 execute d;
end $$;

-- Bought credits can fund 720p generation after the one-video trial is used.
-- Plan-based resolution checks have already run at this point.
do $$ declare d text; anchor text := '  if current_plan_slug = ''free-trial'' then'; begin
 d := pg_get_functiondef('public.queue_video_project(bigint,bigint,bigint,text,bigint[],text,text)'::regprocedure);
 if position(anchor in d)=0 then raise exception 'Unexpected video queue function'; end if;
 d := overlay(d placing $patch$  perform 1 from public.credit_wallets where workspace_id = target_workspace_id for update;
  if current_plan_slug = 'free-trial' and exists (
    select 1 from public.credit_wallets where workspace_id = target_workspace_id and purchased_balance >= computed_credit_cost
  ) then current_plan_slug := 'credit-pack'; end if;
$patch$ from position(anchor in d) for 0);
 execute d;
end $$;
commit;
