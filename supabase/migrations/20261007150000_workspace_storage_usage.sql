-- Real storage usage for Settings → Storage: uploaded photos and brand assets in
-- Supabase Storage, plus finished videos in R2 (size recorded by the worker).
create or replace function public.get_workspace_storage_usage(target_workspace_id bigint)
returns table(photos_bytes bigint, photos_count integer, assets_bytes bigint, videos_bytes bigint, videos_count integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'Not a member of this workspace';
  end if;
  return query
  select
    coalesce(sum((o.metadata->>'size')::bigint) filter (where o.bucket_id = 'listing-photos'), 0)::bigint,
    (count(*) filter (where o.bucket_id = 'listing-photos'))::integer,
    coalesce(sum((o.metadata->>'size')::bigint) filter (where o.bucket_id = 'brand-assets'), 0)::bigint,
    (select coalesce(sum((v.provider_metadata->>'size_bytes')::bigint), 0)::bigint
       from public.video_versions v join public.video_projects p on p.id = v.video_project_id
      where p.workspace_id = target_workspace_id and v.status = 'ready'),
    (select count(*)::integer
       from public.video_versions v join public.video_projects p on p.id = v.video_project_id
      where p.workspace_id = target_workspace_id and v.status = 'ready')
  from storage.objects o
  where o.bucket_id in ('listing-photos', 'brand-assets')
    and (storage.foldername(o.name))[1] = target_workspace_id::text;
end;
$$;

revoke all on function public.get_workspace_storage_usage(bigint) from public, anon;
grant execute on function public.get_workspace_storage_usage(bigint) to authenticated;
