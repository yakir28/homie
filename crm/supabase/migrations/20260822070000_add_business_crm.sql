begin;

create table public.crm_contacts (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  company text check (company is null or char_length(company) <= 120),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 40),
  source text not null default 'manual' check (source in ('manual', 'website', 'instagram', 'referral', 'outbound', 'partner')),
  stage text not null default 'lead' check (stage in ('lead', 'contacted', 'qualified', 'proposal', 'customer', 'lost')),
  estimated_value numeric(12,2) check (estimated_value is null or estimated_value >= 0),
  next_follow_up date,
  notes text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_tasks (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  contact_id bigint references public.crm_contacts(id) on delete set null,
  title text not null check (char_length(title) between 1 and 180),
  area text not null default 'sales' check (area in ('sales', 'product', 'marketing', 'content', 'operations', 'finance')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date,
  assigned_to uuid references public.profiles(id) on delete set null,
  details text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_resources (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  category text not null check (category in ('document', 'agent', 'integration', 'process', 'expense', 'idea')),
  status text not null default 'planned' check (status in ('planned', 'active', 'paused', 'archived')),
  url text,
  summary text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crm_contacts_workspace_stage_idx on public.crm_contacts (workspace_id, stage, updated_at desc);
create index crm_contacts_follow_up_idx on public.crm_contacts (workspace_id, next_follow_up) where next_follow_up is not null;
create index crm_tasks_workspace_status_due_idx on public.crm_tasks (workspace_id, status, due_date);
create index crm_tasks_contact_idx on public.crm_tasks (contact_id) where contact_id is not null;
create index crm_resources_workspace_category_idx on public.crm_resources (workspace_id, category, updated_at desc);

create trigger crm_contacts_set_updated_at before update on public.crm_contacts for each row execute function public.set_updated_at();
create trigger crm_tasks_set_updated_at before update on public.crm_tasks for each row execute function public.set_updated_at();
create trigger crm_resources_set_updated_at before update on public.crm_resources for each row execute function public.set_updated_at();

alter table public.crm_contacts enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_resources enable row level security;

create policy crm_contacts_member_select on public.crm_contacts for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy crm_contacts_member_insert on public.crm_contacts for insert to authenticated
with check ((select private.is_workspace_member(workspace_id)) and created_by = (select auth.uid()));
create policy crm_contacts_member_update on public.crm_contacts for update to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));
create policy crm_contacts_admin_delete on public.crm_contacts for delete to authenticated
using ((select private.is_workspace_admin(workspace_id)));

create policy crm_tasks_member_select on public.crm_tasks for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy crm_tasks_member_insert on public.crm_tasks for insert to authenticated
with check ((select private.is_workspace_member(workspace_id)) and created_by = (select auth.uid()));
create policy crm_tasks_member_update on public.crm_tasks for update to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));
create policy crm_tasks_admin_delete on public.crm_tasks for delete to authenticated
using ((select private.is_workspace_admin(workspace_id)));

create policy crm_resources_member_select on public.crm_resources for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy crm_resources_member_insert on public.crm_resources for insert to authenticated
with check ((select private.is_workspace_member(workspace_id)) and created_by = (select auth.uid()));
create policy crm_resources_member_update on public.crm_resources for update to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));
create policy crm_resources_admin_delete on public.crm_resources for delete to authenticated
using ((select private.is_workspace_admin(workspace_id)));

grant select, insert, update, delete on public.crm_contacts, public.crm_tasks, public.crm_resources to authenticated;
grant usage, select on sequence public.crm_contacts_id_seq, public.crm_tasks_id_seq, public.crm_resources_id_seq to authenticated;

commit;
