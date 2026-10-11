begin;
create function public.first_video_offer_state(target_user_id uuid,target_workspace_id bigint)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'purchased',exists(select 1 from public.polar_first_video_purchases p
   join public.polar_credit_orders o on o.id=p.order_id
   where p.user_id=target_user_id and p.workspace_id=target_workspace_id and o.paid and o.granted),
 'eligible',exists(select 1 from public.polar_first_video_purchases p
   join public.polar_credit_orders o on o.id=p.order_id
   join public.credit_ledger l on l.idempotency_key='polar-order:'||o.id
   join public.video_projects v on v.workspace_id=p.workspace_id and v.created_by=p.user_id
   where p.user_id=target_user_id and p.workspace_id=target_workspace_id
   and o.paid and o.granted and o.refunded_credits=0
   and v.created_at>=l.created_at and v.status in ('awaiting_approval','approved')))
 where exists(select 1 from public.workspace_members where user_id=target_user_id and workspace_id=target_workspace_id);
$$;
revoke all on function public.first_video_offer_state(uuid,bigint) from public,anon,authenticated;
grant execute on function public.first_video_offer_state(uuid,bigint) to service_role;
do $$ declare d text; begin
 d := pg_get_functiondef('public.fulfill_polar_credit_order(text,bigint,text,integer,integer,integer,boolean)'::regprocedure);
 if position('credits not in (30,60,150,300,600)' in d)=0 then raise exception 'Unexpected credit catalog'; end if;
 d := replace(d,'credits not in (30,60,150,300,600)','credits not in (30,60,90,150,300,600)');
 d := replace(d,'when 60 then 2200','when 90 then 2000 when 60 then 2200');
 execute d;
end $$;
commit;
