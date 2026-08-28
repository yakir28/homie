+create table if not exists public.crm_financial_transactions (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('income','outcome')),
  title text not null check (char_length(title) between 1 and 160),
  category text not null default 'other',
  amount numeric(14,2) not null check (amount >= 0),
  transaction_date date not null default current_date,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_financial_transactions_workspace_date_idx on public.crm_financial_transactions(workspace_id, transaction_date desc);
create index if not exists crm_financial_transactions_workspace_type_idx on public.crm_financial_transactions(workspace_id, transaction_type);
alter table public.crm_financial_transactions enable row level security;
create policy crm_financial_transactions_admin_select on public.crm_financial_transactions for select to authenticated using ((select private.is_crm_admin()));
create policy crm_financial_transactions_admin_insert on public.crm_financial_transactions for insert to authenticated with check ((select private.is_crm_admin()) and created_by=(select auth.uid()));
create policy crm_financial_transactions_admin_update on public.crm_financial_transactions for update to authenticated using ((select private.is_crm_admin())) with check ((select private.is_crm_admin()));
create policy crm_financial_transactions_admin_delete on public.crm_financial_transactions for delete to authenticated using ((select private.is_crm_admin(array['owner','admin'])));
grant select,insert,update,delete on public.crm_financial_transactions to authenticated;
grant usage,select on sequence public.crm_financial_transactions_id_seq to authenticated;
