begin;

create index crm_contacts_owner_idx on public.crm_contacts (owner_id) where owner_id is not null;
create index crm_contacts_created_by_idx on public.crm_contacts (created_by);
create index crm_tasks_assigned_to_idx on public.crm_tasks (assigned_to) where assigned_to is not null;
create index crm_tasks_created_by_idx on public.crm_tasks (created_by);
create index crm_resources_owner_idx on public.crm_resources (owner_id) where owner_id is not null;
create index crm_resources_created_by_idx on public.crm_resources (created_by);

commit;
