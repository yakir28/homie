begin;
-- Keep the existing plan slug for compatibility, but never grant signup credits.
do $$ declare d text; begin
 d := pg_get_functiondef('public.bootstrap_workspace(text)'::regprocedure);
 if position('then 30 else 0 end' in d)=0 then raise exception 'Unexpected bootstrap grant'; end if;
 execute replace(d,'then 30 else 0 end','then 0 else 0 end');
end $$;
update public.plans set name='First Video', monthly_credits=0,
 features='["30 credits after a one-time $1 payment","720p video creation","One introductory purchase per user"]'::jsonb
where slug='free-trial';

create table public.polar_first_video_purchases (
 user_id uuid primary key references auth.users(id), workspace_id bigint not null unique references public.workspaces(id),
 reservation_id uuid not null, checkout_id text unique, checkout_url text, order_id text unique,
 created_at timestamptz not null default now()
);
alter table public.polar_first_video_purchases enable row level security;
revoke all on public.polar_first_video_purchases from public,anon,authenticated;

-- Caller supplies a fresh nonce. Only its owner may create the external checkout.
-- Reset is permitted by the service only after Polar confirms the old checkout expired.
create function public.reserve_first_video(target_user_id uuid,target_workspace_id bigint,nonce uuid,expired_checkout_id text default null)
returns public.polar_first_video_purchases language plpgsql security definer set search_path='' as $$
declare r public.polar_first_video_purchases;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_user_id::text, 0));
 if not exists(select 1 from public.workspace_members where user_id=target_user_id and workspace_id=target_workspace_id) then raise exception 'Workspace access denied'; end if;
 insert into public.polar_first_video_purchases(user_id,workspace_id,reservation_id)
 values(target_user_id,target_workspace_id,nonce) on conflict(user_id) do nothing;
 select * into r from public.polar_first_video_purchases where user_id=target_user_id for update;
 if r.workspace_id<>target_workspace_id then raise exception 'First-video offer already reserved in another workspace'; end if;
 if r.order_id is not null then raise exception 'First-video offer already used'; end if;
 if expired_checkout_id is not null and r.checkout_id=expired_checkout_id then
  update public.polar_first_video_purchases set reservation_id=nonce,checkout_id=null,checkout_url=null where user_id=target_user_id returning * into r;
 end if;
 return r;
end $$;
revoke all on function public.reserve_first_video(uuid,bigint,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_first_video(uuid,bigint,uuid,text) to service_role;

-- Reuse the replay/refund journal for the server-authorized $1 product.
do $$ declare d text; begin
 d := pg_get_functiondef('public.fulfill_polar_credit_order(text,bigint,text,integer,integer,integer,boolean)'::regprocedure);
 if position('credits not in (60,150,300,600)' in d)=0 then raise exception 'Unexpected pack fulfillment'; end if;
 d := replace(d,'credits not in (60,150,300,600)','credits not in (30,60,150,300,600)');
 d := replace(d,'case credits when 60','case credits when 30 then 100 when 60');
 execute d;
end $$;

create function public.fulfill_polar_first_video(order_id text,target_workspace_id bigint,product_id text,checkout_id text,refunded_amount integer,is_paid boolean)
returns void language plpgsql security definer set search_path='' as $$
declare r public.polar_first_video_purchases;
begin
 select * into r from public.polar_first_video_purchases p where p.checkout_id=fulfill_polar_first_video.checkout_id for update;
 if not found or r.workspace_id<>target_workspace_id then raise exception 'Unknown first-video checkout'; end if;
 if r.order_id is not null and r.order_id<>fulfill_polar_first_video.order_id then raise exception 'First-video purchase already used'; end if;
 perform public.fulfill_polar_credit_order(order_id,target_workspace_id,product_id,30,100,refunded_amount,is_paid);
 -- Refunds never make this introductory offer available again.
 update public.polar_first_video_purchases p set order_id=fulfill_polar_first_video.order_id where p.user_id=r.user_id;
end $$;
revoke all on function public.fulfill_polar_first_video(text,bigint,text,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.fulfill_polar_first_video(text,bigint,text,text,integer,boolean) to service_role;
grant select,update on public.polar_first_video_purchases to service_role;
-- Reclaim only an identifiable, completely unused signup gift. Bought credits
-- and any wallet with spending/manual adjustments are excluded for manual review.
with eligible as (
 select w.workspace_id from public.credit_wallets w
 join public.subscriptions s on s.workspace_id=w.workspace_id
 join public.plans p on p.id=s.plan_id
 where p.slug='free-trial' and w.lifetime_spent=0 and w.balance-w.purchased_balance=30
 and exists(select 1 from public.credit_ledger l where l.workspace_id=w.workspace_id and l.entry_type='trial')
 and not exists(select 1 from public.credit_ledger l where l.workspace_id=w.workspace_id and l.entry_type not in ('trial','top_up'))
), recorded as (
 insert into public.credit_ledger(workspace_id,amount,entry_type,description,idempotency_key)
 select workspace_id,-30,'adjustment','Remove unused signup gift; first video requires payment','paid-first-video:remove-gift:'||workspace_id from eligible
 on conflict(idempotency_key) do nothing returning workspace_id
)
update public.credit_wallets w set balance=w.balance-30,updated_at=now() from recorded r where w.workspace_id=r.workspace_id;
commit;
