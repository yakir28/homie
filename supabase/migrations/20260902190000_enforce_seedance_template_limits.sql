begin;

update public.video_templates
set generation_config = generation_config || jsonb_build_object(
  'provider', 'higgsfield',
  'higgsfield_model', 'seedance_2_0',
  'higgsfield_resolution', '1080p'
)
where is_active = true;

create or replace function public.queue_video_project(
  target_workspace_id bigint,
  target_listing_id bigint,
  target_template_id bigint,
  project_title text,
  selected_photo_ids bigint[],
  target_aspect_ratio text,
  target_resolution text
)
returns public.video_projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_template public.video_templates;
  created_project public.video_projects;
  selected_count integer;
  selected_recipe jsonb;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if not private.is_workspace_member(target_workspace_id) then raise exception 'Workspace access denied'; end if;
  if target_aspect_ratio not in ('9:16', '16:9', '1:1', '4:3', '3:4', '21:9') then raise exception 'Unsupported aspect ratio'; end if;
  if target_resolution not in ('480p', '720p', '1080p', '4k') then raise exception 'Unsupported resolution'; end if;
  if not exists (select 1 from public.listings where id = target_listing_id and workspace_id = target_workspace_id) then
    raise exception 'Listing not found in this workspace';
  end if;

  select * into selected_template from public.video_templates where id = target_template_id and is_active = true;
  if not found then raise exception 'Template is unavailable'; end if;
  if selected_template.duration_seconds > 30 then raise exception 'Seedance templates cannot exceed 30 seconds'; end if;

  selected_count := coalesce(array_length(selected_photo_ids, 1), 0);
  if selected_count < selected_template.min_photos or selected_count > selected_template.max_photos then
    raise exception 'Select between % and % photos', selected_template.min_photos, selected_template.max_photos;
  end if;
  if selected_count <> (select count(distinct p.id) from public.listing_photos p where p.listing_id = target_listing_id and p.id = any(selected_photo_ids)) then
    raise exception 'One or more photos do not belong to this listing';
  end if;

  update public.credit_wallets
  set balance = balance - selected_template.credits_cost,
      lifetime_spent = lifetime_spent + selected_template.credits_cost,
      updated_at = now()
  where workspace_id = target_workspace_id and balance >= selected_template.credits_cost;
  if not found then raise exception 'Not enough credits'; end if;

  selected_recipe := selected_template.generation_config || jsonb_build_object(
    'provider', 'higgsfield',
    'higgsfield_model', 'seedance_2_0',
    'higgsfield_resolution', target_resolution,
    'selected_aspect_ratio', target_aspect_ratio,
    'template_duration_seconds', selected_template.duration_seconds
  );

  insert into public.video_projects (
    workspace_id, listing_id, template_id, created_by, title, status,
    output_format, duration_seconds, credits_cost, template_prompt_snapshot
  ) values (
    target_workspace_id, target_listing_id, target_template_id, current_user_id,
    left(coalesce(nullif(trim(project_title), ''), selected_template.name), 200),
    'queued', target_aspect_ratio, selected_template.duration_seconds,
    selected_template.credits_cost, selected_recipe
  ) returning * into created_project;

  insert into public.video_project_photos (video_project_id, listing_photo_id, sort_order)
  select created_project.id, photo_id, ordinality - 1
  from unnest(selected_photo_ids) with ordinality as picked(photo_id, ordinality);

  insert into public.credit_ledger (workspace_id, video_project_id, amount, entry_type, description, idempotency_key, created_by)
  values (
    target_workspace_id, created_project.id, -selected_template.credits_cost,
    'generation', concat('Video generation: ', created_project.title),
    concat('video-project:', created_project.id, ':generation'), current_user_id
  );

  return created_project;
end;
$$;

revoke all on function public.queue_video_project(bigint, bigint, bigint, text, bigint[], text, text) from public, anon;
grant execute on function public.queue_video_project(bigint, bigint, bigint, text, bigint[], text, text) to authenticated;

commit;
