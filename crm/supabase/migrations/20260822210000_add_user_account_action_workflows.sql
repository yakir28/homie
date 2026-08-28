create or replace function public.crm_list_plans()
returns table(id bigint,name text,slug text,monthly_credits integer)
language plpgsql security definer set search_path=''
as $$
begin
  if not private.is_crm_admin() then raise exception 'CRM administrator access required'; end if;
  return query select p.id,p.name,p.slug,p.monthly_credits from public.plans p where p.is_active order by p.sort_order,p.id;
end;
$$;

create or replace function public.crm_update_workspace_role(target_user_id uuid,next_role text)
returns text
language plpgsql security definer set search_path=''
as $$
declare target_workspace_id bigint; current_role text;
begin
  if not private.is_crm_admin(array['owner','admin']) then raise exception 'CRM owner or admin access required'; end if;
  if next_role not in ('owner','admin','agent') then raise exception 'Invalid workspace role'; end if;
  select wm.workspace_id,wm.role into target_workspace_id,current_role
  from public.workspace_members wm where wm.user_id=target_user_id order by wm.joined_at limit 1;
  if target_workspace_id is null then raise exception 'User has no workspace membership'; end if;
  if current_role='owner' and next_role<>'owner' and
    (select count(*) from public.workspace_members where workspace_id=target_workspace_id and role='owner')<=1
  then raise exception 'Cannot remove the final workspace owner'; end if;
  update public.workspace_members set role=next_role where workspace_id=target_workspace_id and user_id=target_user_id;
  insert into public.crm_admin_audit(actor_id,target_user_id,action,metadata)
  values ((select auth.uid()),target_user_id,'workspace_role_changed',jsonb_build_object('workspace_id',target_workspace_id,'from',current_role,'to',next_role));
  return next_role;
end;
$$;

create or replace function public.crm_update_plan_credits(target_user_id uuid,next_plan_slug text,next_credit_balance integer)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare target_workspace_id bigint; target_plan_id bigint; target_plan_name text;
begin
  if not private.is_crm_admin(array['owner','admin']) then raise exception 'CRM owner or admin access required'; end if;
  if next_credit_balance<0 then raise exception 'Credit balance cannot be negative'; end if;
  select wm.workspace_id into target_workspace_id from public.workspace_members wm where wm.user_id=target_user_id order by wm.joined_at limit 1;
  if target_workspace_id is null then raise exception 'User has no workspace membership'; end if;
  select p.id,p.name into target_plan_id,target_plan_name from public.plans p where p.slug=next_plan_slug and p.is_active;
  if target_plan_id is null then raise exception 'Invalid plan'; end if;
  insert into public.subscriptions(workspace_id,plan_id,provider,status,billing_interval)
  values(target_workspace_id,target_plan_id,'manual',case when next_plan_slug='free-trial' then 'trialing' else 'active' end,'monthly')
  on conflict(workspace_id) do update set plan_id=excluded.plan_id,provider='manual',status=excluded.status,updated_at=now();
  insert into public.credit_wallets(workspace_id,balance,lifetime_credited,lifetime_spent,updated_at)
  values(target_workspace_id,next_credit_balance,next_credit_balance,0,now())
  on conflict(workspace_id) do update set balance=excluded.balance,updated_at=now();
  insert into public.crm_admin_audit(actor_id,target_user_id,action,metadata)
  values ((select auth.uid()),target_user_id,'plan_credits_changed',jsonb_build_object('workspace_id',target_workspace_id,'plan',target_plan_name,'credits',next_credit_balance));
  return jsonb_build_object('plan_name',target_plan_name,'credit_balance',next_credit_balance,'subscription_status',case when next_plan_slug='free-trial' then 'trialing' else 'active' end);
end;
$$;
revoke all on function public.crm_list_plans() from public,anon;
revoke all on function public.crm_update_workspace_role(uuid,text) from public,anon;
revoke all on function public.crm_update_plan_credits(uuid,text,integer) from public,anon;
grant execute on function public.crm_list_plans() to authenticated;
grant execute on function public.crm_update_workspace_role(uuid,text) to authenticated;
grant execute on function public.crm_update_plan_credits(uuid,text,integer) to authenticated;
