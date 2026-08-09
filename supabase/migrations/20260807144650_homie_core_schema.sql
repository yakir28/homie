-- Homie core schema: multi-tenant real-estate AI video platform.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  phone text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  workspace_type text not null default 'team' check (workspace_type in ('solo', 'team')),
  logo_url text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'agent' check (role in ('owner', 'admin', 'agent')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.team_invitations (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'agent' check (role in ('admin', 'agent')),
  token_hash text not null unique,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table public.integrations (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('zillow', 'airbnb')),
  status text not null default 'disconnected' check (status in ('disconnected', 'connecting', 'connected', 'syncing', 'expired', 'error')),
  external_account_id text,
  external_account_name text,
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  last_error text,
  connected_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider, external_account_id)
);

create table public.listings (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  integration_id bigint references public.integrations(id) on delete set null,
  external_listing_id text,
  source text not null default 'zillow' check (source in ('zillow', 'airbnb', 'upload')),
  status text not null default 'active' check (status in ('importing', 'active', 'pending', 'inactive', 'off_market', 'sync_error')),
  address_line1 text not null,
  address_line2 text,
  city text not null,
  region text,
  postal_code text,
  country_code text not null default 'US' check (char_length(country_code) = 2),
  price numeric(14,2) check (price is null or price >= 0),
  bedrooms numeric(4,1) check (bedrooms is null or bedrooms >= 0),
  bathrooms numeric(4,1) check (bathrooms is null or bathrooms >= 0),
  square_feet integer check (square_feet is null or square_feet > 0),
  listing_url text,
  description text,
  cover_photo_url text,
  raw_data jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (workspace_id, source, external_listing_id)
);

create table public.listing_photos (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.listings(id) on delete cascade,
  source_url text,
  storage_path text,
  thumbnail_url text,
  room_type text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_selected boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (source_url is not null or storage_path is not null),
  unique (listing_id, sort_order)
);

create table public.template_categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.video_templates (
  id bigint generated always as identity primary key,
  category_id bigint references public.template_categories(id) on delete set null,
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  style_label text not null,
  format text not null check (format in ('9:16', '1:1', '16:9')),
  duration_seconds integer not null check (duration_seconds between 5 and 180),
  credits_cost integer not null check (credits_cost > 0),
  min_photos integer not null default 6 check (min_photos > 0),
  max_photos integer not null default 30 check (max_photos >= min_photos),
  preview_url text not null,
  thumbnail_url text not null,
  generation_config jsonb not null default '{}'::jsonb,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.template_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id bigint not null references public.video_templates(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, template_id)
);

create table public.video_projects (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  listing_id bigint not null references public.listings(id) on delete restrict,
  template_id bigint not null references public.video_templates(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'queued', 'generating', 'awaiting_approval', 'approved', 'failed', 'canceled')),
  output_format text not null check (output_format in ('9:16', '1:1', '16:9')),
  duration_seconds integer not null check (duration_seconds between 5 and 180),
  credits_cost integer not null check (credits_cost >= 0),
  generation_progress smallint not null default 0 check (generation_progress between 0 and 100),
  generation_error text,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.video_project_photos (
  video_project_id bigint not null references public.video_projects(id) on delete cascade,
  listing_photo_id bigint not null references public.listing_photos(id) on delete restrict,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  primary key (video_project_id, listing_photo_id),
  unique (video_project_id, sort_order)
);

create table public.video_versions (
  id bigint generated always as identity primary key,
  video_project_id bigint not null references public.video_projects(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'queued' check (status in ('queued', 'generating', 'ready', 'failed')),
  video_url text,
  thumbnail_url text,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  provider_job_id text,
  provider_metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (video_project_id, version_number)
);

create table public.video_approvals (
  id bigint generated always as identity primary key,
  video_project_id bigint not null references public.video_projects(id) on delete cascade,
  video_version_id bigint not null references public.video_versions(id) on delete restrict,
  approved_by uuid not null references public.profiles(id) on delete restrict,
  decision text not null check (decision in ('approved', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.plans (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique,
  audience text not null check (audience in ('solo', 'team')),
  monthly_price numeric(10,2) check (monthly_price is null or monthly_price >= 0),
  yearly_price numeric(10,2) check (yearly_price is null or yearly_price >= 0),
  monthly_credits integer not null default 0 check (monthly_credits >= 0),
  seat_limit integer check (seat_limit is null or seat_limit > 0),
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id bigint generated always as identity primary key,
  workspace_id bigint not null unique references public.workspaces(id) on delete cascade,
  plan_id bigint not null references public.plans(id) on delete restrict,
  provider text not null default 'stripe' check (provider in ('stripe', 'manual')),
  provider_customer_id text,
  provider_subscription_id text unique,
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'canceled', 'paused', 'expired')),
  billing_interval text not null default 'monthly' check (billing_interval in ('monthly', 'yearly')),
  trial_ends_at timestamptz,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credit_wallets (
  workspace_id bigint primary key references public.workspaces(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_credited bigint not null default 0 check (lifetime_credited >= 0),
  lifetime_spent bigint not null default 0 check (lifetime_spent >= 0),
  updated_at timestamptz not null default now()
);

create table public.credit_ledger (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  video_project_id bigint references public.video_projects(id) on delete set null,
  amount integer not null check (amount <> 0),
  entry_type text not null check (entry_type in ('trial', 'subscription', 'top_up', 'generation', 'refund', 'adjustment')),
  description text not null,
  idempotency_key text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.activity_log (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Foreign key and access-pattern indexes.
create index workspace_members_user_id_idx on public.workspace_members (user_id, workspace_id);
create index team_invitations_workspace_id_idx on public.team_invitations (workspace_id);
create index integrations_workspace_status_idx on public.integrations (workspace_id, status);
create index listings_workspace_status_created_idx on public.listings (workspace_id, status, created_at desc);
create index listings_integration_id_idx on public.listings (integration_id);
create index listing_photos_listing_order_idx on public.listing_photos (listing_id, sort_order);
create index video_templates_category_active_idx on public.video_templates (category_id, is_active, sort_order);
create index template_favorites_template_id_idx on public.template_favorites (template_id);
create index video_projects_workspace_status_created_idx on public.video_projects (workspace_id, status, created_at desc);
create index video_projects_listing_id_idx on public.video_projects (listing_id);
create index video_projects_template_id_idx on public.video_projects (template_id);
create index video_projects_created_by_idx on public.video_projects (created_by);
create index video_projects_approved_by_idx on public.video_projects (approved_by) where approved_by is not null;
create index video_project_photos_photo_id_idx on public.video_project_photos (listing_photo_id);
create index video_versions_project_created_idx on public.video_versions (video_project_id, created_at desc);
create index video_approvals_project_created_idx on public.video_approvals (video_project_id, created_at desc);
create index video_approvals_version_id_idx on public.video_approvals (video_version_id);
create index video_approvals_approved_by_idx on public.video_approvals (approved_by);
create index subscriptions_plan_id_idx on public.subscriptions (plan_id);
create index credit_ledger_workspace_created_idx on public.credit_ledger (workspace_id, created_at desc);
create index credit_ledger_project_id_idx on public.credit_ledger (video_project_id) where video_project_id is not null;
create index activity_log_workspace_created_idx on public.activity_log (workspace_id, created_at desc);
create index activity_log_actor_id_idx on public.activity_log (actor_id) where actor_id is not null;

-- Keep timestamps accurate.
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger workspaces_set_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger integrations_set_updated_at before update on public.integrations for each row execute function public.set_updated_at();
create trigger listings_set_updated_at before update on public.listings for each row execute function public.set_updated_at();
create trigger templates_set_updated_at before update on public.video_templates for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.video_projects for each row execute function public.set_updated_at();
create trigger plans_set_updated_at before update on public.plans for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

-- Create a profile automatically for Supabase Auth users.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

-- Workspace membership helpers. The private schema is not exposed by PostgREST.
create or replace function private.is_workspace_member(target_workspace_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_workspace_admin(target_workspace_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner', 'admin')
  );
$$;
revoke all on function private.is_workspace_member(bigint) from public, anon;
revoke all on function private.is_workspace_admin(bigint) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_workspace_member(bigint) to authenticated;
grant execute on function private.is_workspace_admin(bigint) to authenticated;

create or replace function public.bootstrap_workspace(workspace_name text default 'My Homie Workspace')
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  existing_workspace_id bigint;
  new_workspace_id bigint;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select wm.workspace_id into existing_workspace_id
  from public.workspace_members wm
  where wm.user_id = current_user_id
  order by wm.joined_at
  limit 1;

  if existing_workspace_id is not null then
    return existing_workspace_id;
  end if;

  insert into public.workspaces (name, slug, workspace_type, created_by)
  values (
    left(coalesce(nullif(trim(workspace_name), ''), 'My Homie Workspace'), 120),
    'homie-' || replace(left(current_user_id::text, 18), '-', ''),
    'solo',
    current_user_id
  )
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, current_user_id, 'owner');

  insert into public.credit_wallets (workspace_id, balance)
  values (new_workspace_id, 50);

  insert into public.subscriptions (workspace_id, plan_id, status, trial_ends_at)
  select new_workspace_id, p.id, 'trialing', now() + interval '14 days'
  from public.plans p
  where p.slug = 'free-trial';

  insert into public.credit_ledger (workspace_id, amount, balance_after, entry_type, description, reference_type)
  values (new_workspace_id, 50, 50, 'trial', 'Free trial credits', 'subscription');

  return new_workspace_id;
end;
$$;

-- RLS on every public table.
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.team_invitations enable row level security;
alter table public.integrations enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.template_categories enable row level security;
alter table public.video_templates enable row level security;
alter table public.template_favorites enable row level security;
alter table public.video_projects enable row level security;
alter table public.video_project_photos enable row level security;
alter table public.video_versions enable row level security;
alter table public.video_approvals enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.activity_log enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy workspaces_select_member on public.workspaces for select to authenticated using (created_by = (select auth.uid()) or (select private.is_workspace_member(id)));
create policy workspaces_insert_creator on public.workspaces for insert to authenticated with check (created_by = (select auth.uid()));
create policy workspaces_update_admin on public.workspaces for update to authenticated using ((select private.is_workspace_admin(id))) with check ((select private.is_workspace_admin(id)));
create policy workspaces_delete_owner on public.workspaces for delete to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id = id and wm.user_id = (select auth.uid()) and wm.role = 'owner'));

create policy members_select_workspace on public.workspace_members for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy members_insert_admin on public.workspace_members for insert to authenticated with check ((select private.is_workspace_admin(workspace_id)) or (user_id = (select auth.uid()) and exists (select 1 from public.workspaces w where w.id = workspace_id and w.created_by = (select auth.uid()))));
create policy members_update_admin on public.workspace_members for update to authenticated using ((select private.is_workspace_admin(workspace_id))) with check ((select private.is_workspace_admin(workspace_id)));
create policy members_delete_admin on public.workspace_members for delete to authenticated using ((select private.is_workspace_admin(workspace_id)) and role <> 'owner');

create policy invitations_select_admin on public.team_invitations for select to authenticated using ((select private.is_workspace_admin(workspace_id)));
create policy invitations_insert_admin on public.team_invitations for insert to authenticated with check ((select private.is_workspace_admin(workspace_id)) and invited_by = (select auth.uid()));
create policy invitations_delete_admin on public.team_invitations for delete to authenticated using ((select private.is_workspace_admin(workspace_id)));

create policy integrations_select_member on public.integrations for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy integrations_insert_admin on public.integrations for insert to authenticated with check ((select private.is_workspace_admin(workspace_id)));
create policy integrations_update_admin on public.integrations for update to authenticated using ((select private.is_workspace_admin(workspace_id))) with check ((select private.is_workspace_admin(workspace_id)));
create policy integrations_delete_admin on public.integrations for delete to authenticated using ((select private.is_workspace_admin(workspace_id)));

create policy listings_select_member on public.listings for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy listings_insert_member on public.listings for insert to authenticated with check ((select private.is_workspace_member(workspace_id)));
create policy listings_update_member on public.listings for update to authenticated using ((select private.is_workspace_member(workspace_id))) with check ((select private.is_workspace_member(workspace_id)));
create policy listings_delete_admin on public.listings for delete to authenticated using ((select private.is_workspace_admin(workspace_id)));

create policy listing_photos_select_member on public.listing_photos for select to authenticated using (exists (select 1 from public.listings l where l.id = listing_id and (select private.is_workspace_member(l.workspace_id))));
create policy listing_photos_insert_member on public.listing_photos for insert to authenticated with check (exists (select 1 from public.listings l where l.id = listing_id and (select private.is_workspace_member(l.workspace_id))));
create policy listing_photos_update_member on public.listing_photos for update to authenticated using (exists (select 1 from public.listings l where l.id = listing_id and (select private.is_workspace_member(l.workspace_id)))) with check (exists (select 1 from public.listings l where l.id = listing_id and (select private.is_workspace_member(l.workspace_id))));
create policy listing_photos_delete_member on public.listing_photos for delete to authenticated using (exists (select 1 from public.listings l where l.id = listing_id and (select private.is_workspace_member(l.workspace_id))));

create policy categories_public_read on public.template_categories for select to anon, authenticated using (true);
create policy templates_public_read on public.video_templates for select to anon, authenticated using (is_active);
create policy favorites_own_all on public.template_favorites for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy projects_select_member on public.video_projects for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy projects_insert_member on public.video_projects for insert to authenticated with check ((select private.is_workspace_member(workspace_id)) and created_by = (select auth.uid()));
create policy projects_update_member on public.video_projects for update to authenticated using ((select private.is_workspace_member(workspace_id))) with check ((select private.is_workspace_member(workspace_id)));
create policy projects_delete_admin on public.video_projects for delete to authenticated using ((select private.is_workspace_admin(workspace_id)));

create policy project_photos_member_all on public.video_project_photos for all to authenticated using (exists (select 1 from public.video_projects p where p.id = video_project_id and (select private.is_workspace_member(p.workspace_id)))) with check (exists (select 1 from public.video_projects p where p.id = video_project_id and (select private.is_workspace_member(p.workspace_id))));
create policy versions_member_all on public.video_versions for all to authenticated using (exists (select 1 from public.video_projects p where p.id = video_project_id and (select private.is_workspace_member(p.workspace_id)))) with check (exists (select 1 from public.video_projects p where p.id = video_project_id and (select private.is_workspace_member(p.workspace_id))));
create policy approvals_member_select on public.video_approvals for select to authenticated using (exists (select 1 from public.video_projects p where p.id = video_project_id and (select private.is_workspace_member(p.workspace_id))));
create policy approvals_member_insert on public.video_approvals for insert to authenticated with check (approved_by = (select auth.uid()) and exists (select 1 from public.video_projects p where p.id = video_project_id and (select private.is_workspace_member(p.workspace_id))));

create policy plans_public_read on public.plans for select to anon, authenticated using (is_active);
create policy subscriptions_member_read on public.subscriptions for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy wallets_member_read on public.credit_wallets for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy ledger_member_read on public.credit_ledger for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy activity_member_read on public.activity_log for select to authenticated using ((select private.is_workspace_member(workspace_id)));

-- Explicit Data API grants (new projects no longer auto-expose tables).
grant usage on schema public to anon, authenticated;
revoke all on function public.bootstrap_workspace(text) from public, anon;
grant execute on function public.bootstrap_workspace(text) to authenticated;
grant select on public.template_categories, public.video_templates, public.plans to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces, public.workspace_members, public.team_invitations, public.integrations, public.listings, public.listing_photos, public.template_favorites, public.video_projects, public.video_project_photos, public.video_versions, public.video_approvals to authenticated;
grant select on public.subscriptions, public.credit_wallets, public.credit_ledger, public.activity_log to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Storage buckets. Object paths must start with the workspace id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-photos', 'listing-photos', false, 20971520, array['image/jpeg', 'image/png', 'image/webp']),
  ('video-outputs', 'video-outputs', false, 1073741824, array['video/mp4', 'video/webm']),
  ('brand-assets', 'brand-assets', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy storage_workspace_read on storage.objects for select to authenticated using (bucket_id in ('listing-photos', 'video-outputs', 'brand-assets') and (select private.is_workspace_member((storage.foldername(name))[1]::bigint)));
create policy storage_workspace_insert on storage.objects for insert to authenticated with check (bucket_id in ('listing-photos', 'video-outputs', 'brand-assets') and (select private.is_workspace_member((storage.foldername(name))[1]::bigint)));
create policy storage_workspace_update on storage.objects for update to authenticated using (bucket_id in ('listing-photos', 'video-outputs', 'brand-assets') and (select private.is_workspace_member((storage.foldername(name))[1]::bigint))) with check (bucket_id in ('listing-photos', 'video-outputs', 'brand-assets') and (select private.is_workspace_member((storage.foldername(name))[1]::bigint)));
create policy storage_workspace_delete on storage.objects for delete to authenticated using (bucket_id in ('listing-photos', 'video-outputs', 'brand-assets') and (select private.is_workspace_member((storage.foldername(name))[1]::bigint)));

-- Seed the initial Homie catalog.
insert into public.template_categories (name, slug, sort_order) values
  ('Cinematic', 'cinematic', 10), ('Luxury', 'luxury', 20), ('Warm', 'warm', 30),
  ('Editorial', 'editorial', 40), ('Minimal', 'minimal', 50), ('Family', 'family', 60),
  ('Coastal', 'coastal', 70), ('Urban', 'urban', 80), ('Fast-paced', 'fast-paced', 90),
  ('Zillow', 'zillow', 100)
on conflict (slug) do nothing;

insert into public.video_templates (category_id, name, slug, description, style_label, format, duration_seconds, credits_cost, min_photos, max_photos, preview_url, thumbnail_url, is_featured, sort_order)
select c.id, v.name, v.slug, v.description, v.style_label, v.format, v.duration_seconds, v.credits_cost, v.min_photos, v.max_photos, v.preview_url, v.thumbnail_url, v.is_featured, v.sort_order
from (values
  ('Cinematic','Quiet Luxury','quiet-luxury','A restrained cinematic tour for premium listings.','Cinematic','9:16',24,18,8,18,'/homes/modern-villa.jpg','/homes/modern-villa.jpg',true,10),
  ('Warm','Sunday Light','sunday-light','Soft, welcoming pacing with bright natural light.','Warm & airy','9:16',18,14,6,16,'/homes/living-room.jpg','/homes/living-room.jpg',false,20),
  ('Editorial','The Detail Edit','the-detail-edit','An editorial cut focused on materials and details.','Editorial','1:1',20,16,6,14,'/homes/kitchen.jpg','/homes/kitchen.jpg',false,30),
  ('Minimal','Modern Living','modern-living','Clean widescreen movement for modern architecture.','Minimal','16:9',30,22,10,24,'/homes/lounge.jpg','/homes/lounge.jpg',false,40),
  ('Family','Welcome Home','welcome-home','A warm, accessible tour for family properties.','Family','9:16',22,16,8,18,'/homes/dining.jpg','/homes/dining.jpg',false,50),
  ('Coastal','Coastal Morning','coastal-morning','Airy pacing and relaxed coastal color.','Coastal','9:16',20,15,8,18,'/homes/living-room.jpg','/homes/living-room.jpg',false,60),
  ('Urban','City Edge','city-edge','Confident cuts made for urban listings.','Urban','16:9',26,19,8,20,'/homes/kitchen.jpg','/homes/kitchen.jpg',false,70),
  ('Zillow','Listing Ready','listing-ready','A concise format optimized for listing platforms.','Zillow','1:1',15,12,6,12,'/homes/dining.jpg','/homes/dining.jpg',false,80),
  ('Fast-paced','Quick Cuts','quick-cuts','Fast social-first pacing for scroll-stopping tours.','Fast-paced','9:16',12,10,6,12,'/homes/lounge.jpg','/homes/lounge.jpg',false,90)
) as v(category_name,name,slug,description,style_label,format,duration_seconds,credits_cost,min_photos,max_photos,preview_url,thumbnail_url,is_featured,sort_order)
join public.template_categories c on c.name = v.category_name
on conflict (slug) do nothing;

insert into public.plans (name, slug, audience, monthly_price, yearly_price, monthly_credits, seat_limit, features, sort_order)
values
  ('Free Trial', 'free-trial', 'solo', 0, 0, 50, 1, '["50 trial credits","Template library","Watermarked exports"]'::jsonb, 10),
  ('Solo Agent', 'solo-agent', 'solo', null, null, 400, 1, '["Zillow sync","All templates","Social and Zillow formats"]'::jsonb, 20),
  ('Office Team', 'office-team', 'team', null, null, 2000, 10, '["Shared workspace","10 agent seats","Priority generation"]'::jsonb, 30)
on conflict (slug) do nothing;

commit;
