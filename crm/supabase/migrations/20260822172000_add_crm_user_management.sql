begin;

create table public.crm_app_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','support','billing')),
  created_at timestamptz not null default now()
);

insert into public.crm_app_admins (user_id, role)
select id, 'owner' from auth.users where lower(email) = 'supportbyhomie@gmail.com'
on conflict (user_id) do nothing;

alter table public.profiles add column if not exists account_status text not null default 'active'
  check (account_status in ('active','suspended','deleted'));
alter table public.profiles add column if not exists last_seen_at timestamptz;

create table public.crm_user_notes (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  note text not null check (char_length(note) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.crm_admin_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index crm_user_notes_user_created_idx on public.crm_user_notes (user_id, created_at desc);
create index crm_user_notes_author_idx on public.crm_user_notes (author_id);
create index crm_admin_audit_target_created_idx on public.crm_admin_audit (target_user_id, created_at desc);
create index crm_admin_audit_actor_idx on public.crm_admin_audit (actor_id);

alter table public.crm_app_admins enable row level security;
alter table public.crm_user_notes enable row level security;
alter table public.crm_admin_audit enable row level security;

create or replace function private.is_crm_admin(allowed_roles text[] default array['owner','admin','support','billing'])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.crm_app_admins a where a.user_id = (select auth.uid()) and a.role = any(allowed_roles));
$$;
revoke all on function private.is_crm_admin(text[]) from public, anon;
grant execute on function private.is_crm_admin(text[]) to authenticated;

create policy crm_admins_read on public.crm_app_admins for select to authenticated using ((select private.is_crm_admin()));
create policy crm_notes_read on public.crm_user_notes for select to authenticated using ((select private.is_crm_admin()));
create policy crm_notes_insert on public.crm_user_notes for insert to authenticated with check ((select private.is_crm_admin()) and author_id = (select auth.uid()));
create policy crm_audit_read on public.crm_admin_audit for select to authenticated using ((select private.is_crm_admin(array['owner','admin'])));

grant select on public.crm_app_admins, public.crm_user_notes, public.crm_admin_audit to authenticated;
grant insert on public.crm_user_notes to authenticated;
grant usage, select on sequence public.crm_user_notes_id_seq to authenticated;

create or replace function public.crm_list_app_users()
returns table (
  id uuid, email text, display_name text, company_name text, phone text, account_status text,
  email_confirmed boolean, created_at timestamptz, last_sign_in_at timestamptz,
  workspace_name text, workspace_role text, plan_name text, subscription_status text,
  credit_balance integer, videos_count bigint, listings_count bigint
)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_crm_admin() then raise exception 'CRM administrator access required'; end if;
  return query
  select u.id, u.email::text, p.display_name, p.company_name, p.phone, p.account_status,
    (u.email_confirmed_at is not null), u.created_at, u.last_sign_in_at,
    w.name, wm.role, pl.name, s.status, coalesce(cw.balance,0),
    (select count(*) from public.video_projects vp where vp.workspace_id = w.id),
    (select count(*) from public.listings l where l.workspace_id = w.id)
  from auth.users u
  join public.profiles p on p.id = u.id
  left join lateral (select m.workspace_id, m.role from public.workspace_members m where m.user_id=u.id order by m.joined_at limit 1) wm on true
  left join public.workspaces w on w.id=wm.workspace_id
  left join public.subscriptions s on s.workspace_id=w.id
  left join public.plans pl on pl.id=s.plan_id
  left join public.credit_wallets cw on cw.workspace_id=w.id
  order by u.created_at desc;
end; $$;

create or replace function public.crm_set_user_status(target_user_id uuid, next_status text, reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_crm_admin(array['owner','admin']) then raise exception 'Admin access required'; end if;
  if next_status not in ('active','suspended') then raise exception 'Invalid status'; end if;
  update public.profiles set account_status=next_status, updated_at=now() where id=target_user_id;
  insert into public.crm_admin_audit(actor_id,target_user_id,action,metadata) values ((select auth.uid()),target_user_id,'user_status_changed',jsonb_build_object('status',next_status,'reason',reason));
end; $$;

grant execute on function public.crm_list_app_users() to authenticated;
grant execute on function public.crm_set_user_status(uuid,text,text) to authenticated;

commit;
