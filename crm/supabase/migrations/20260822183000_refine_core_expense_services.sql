begin;

update public.crm_expenses
set name = 'AI Generation', category = 'api', updated_at = now()
where workspace_id = 78 and name = 'Video Generation API';

insert into public.crm_expenses (workspace_id,name,category,billing_cycle,created_by)
values (78,'API Services','api','usage','4ad1016c-69a7-4230-a585-479dc50d0f2a')
on conflict (workspace_id,name) do nothing;

commit;
