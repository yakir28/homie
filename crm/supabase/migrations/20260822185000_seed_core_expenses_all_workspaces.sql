begin;

insert into public.crm_expenses (workspace_id,name,category,billing_cycle,created_by)
select w.id, service.name, service.category, service.billing_cycle, w.created_by
from public.workspaces w
cross join (values
  ('R2 Storage','storage','usage'),
  ('API Services','api','usage'),
  ('Ad Spend','advertising','monthly'),
  ('AI Generation','api','usage')
) as service(name,category,billing_cycle)
on conflict (workspace_id,name) do nothing;

commit;
