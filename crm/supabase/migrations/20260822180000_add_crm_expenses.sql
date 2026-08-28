begin;

create table public.crm_expenses (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (category in ('storage','api','advertising','database','data','software','other')),
  monthly_budget numeric(12,2) not null default 0 check (monthly_budget >= 0),
  monthly_spend numeric(12,2) not null default 0 check (monthly_spend >= 0),
  status text not null default 'active' check (status in ('active','paused','canceled')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','usage','annual')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create index crm_expenses_workspace_status_idx on public.crm_expenses (workspace_id, status, updated_at desc);
create index crm_expenses_created_by_idx on public.crm_expenses (created_by);
create trigger crm_expenses_set_updated_at before update on public.crm_expenses for each row execute function public.set_updated_at();
alter table public.crm_expenses enable row level security;
create policy crm_expenses_member_select on public.crm_expenses for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy crm_expenses_member_insert on public.crm_expenses for insert to authenticated with check ((select private.is_workspace_member(workspace_id)) and created_by=(select auth.uid()));
create policy crm_expenses_member_update on public.crm_expenses for update to authenticated using ((select private.is_workspace_member(workspace_id))) with check ((select private.is_workspace_member(workspace_id)));
create policy crm_expenses_admin_delete on public.crm_expenses for delete to authenticated using ((select private.is_workspace_admin(workspace_id)));
grant select,insert,update,delete on public.crm_expenses to authenticated;
grant usage,select on sequence public.crm_expenses_id_seq to authenticated;

insert into public.crm_expenses (workspace_id,name,category,billing_cycle,created_by)
values
  (78,'R2 Storage','storage','usage','4ad1016c-69a7-4230-a585-479dc50d0f2a'),
  (78,'Video Generation API','api','usage','4ad1016c-69a7-4230-a585-479dc50d0f2a'),
  (78,'Ad Spend','advertising','monthly','4ad1016c-69a7-4230-a585-479dc50d0f2a'),
  (78,'Supabase','database','monthly','4ad1016c-69a7-4230-a585-479dc50d0f2a'),
  (78,'HasData Scraping','data','usage','4ad1016c-69a7-4230-a585-479dc50d0f2a'),
  (78,'Other Software','software','monthly','4ad1016c-69a7-4230-a585-479dc50d0f2a')
on conflict (workspace_id,name) do nothing;

commit;
