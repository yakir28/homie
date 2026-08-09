begin;

-- Supports the signed-in creator's reverse-chronological "My videos" query.
create index if not exists video_projects_creator_created_idx
  on public.video_projects (created_by, created_at desc);

-- The UI listens for worker progress and status changes. RLS on video_projects
-- still determines which rows each authenticated subscriber can receive.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'video_projects'
  ) then
    alter publication supabase_realtime add table public.video_projects;
  end if;
end
$$;

commit;
