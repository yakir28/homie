begin;

create table public.video_project_shots (
  id bigint generated always as identity primary key,
  video_project_id bigint not null references public.video_projects(id) on delete cascade,
  shot_order integer not null check (shot_order >= 0),
  role text not null,
  duration_seconds integer not null check (duration_seconds between 1 and 30),
  prompt text not null,
  model text not null,
  status text not null default 'queued' check (status in ('queued', 'generating', 'ready', 'failed')),
  provider_job_id text,
  output_url text,
  provider_metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (video_project_id, shot_order)
);

create table public.generation_events (
  id bigint generated always as identity primary key,
  video_project_id bigint not null references public.video_projects(id) on delete cascade,
  stage text not null,
  message text not null,
  progress smallint not null check (progress between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index video_project_shots_project_order_idx on public.video_project_shots (video_project_id, shot_order);
create index generation_events_project_created_idx on public.generation_events (video_project_id, created_at);
create trigger video_project_shots_set_updated_at before update on public.video_project_shots for each row execute function public.set_updated_at();

alter table public.video_project_shots enable row level security;
alter table public.generation_events enable row level security;

create policy shots_member_select on public.video_project_shots for select to authenticated
using (exists (select 1 from public.video_projects p where p.id = video_project_id and (select private.is_workspace_member(p.workspace_id))));

create policy events_member_select on public.generation_events for select to authenticated
using (exists (select 1 from public.video_projects p where p.id = video_project_id and (select private.is_workspace_member(p.workspace_id))));

grant select on public.video_project_shots, public.generation_events to authenticated;
grant usage, select on sequence public.video_project_shots_id_seq, public.generation_events_id_seq to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('video-outputs', 'video-outputs', false, 1073741824, array['video/mp4'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

commit;
