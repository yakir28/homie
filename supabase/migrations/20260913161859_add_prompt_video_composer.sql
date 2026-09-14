begin;

-- Internal recipes share the existing Seedance 2.5 per-second tariff. They have
-- no catalog preview and do not appear among Explore's curated templates.
insert into public.video_templates (
  name, slug, description, style_label, format, duration_seconds, credits_cost,
  min_photos, max_photos, preview_url, thumbnail_url, generation_config, sort_order
)
select 'Custom film · ' || duration.seconds || 's', 'prompt-film-' || duration.seconds || 's',
  'A complete property film directed by your prompt.', 'Custom film', '16:9', duration.seconds,
  greatest(1, ceil(reference.credits_cost::numeric * duration.seconds / reference.duration_seconds)::integer),
  1, 30, '', '', jsonb_build_object(
    'entry_point', 'prompt', 'workflow', 'prompt_property_film',
    'prompt_skill_version', 'real-estate-ai-video-v1',
    'higgsfield_model', 'seedance_2_5', 'higgsfield_mode', 'omni_reference',
    'higgsfield_resolution', '1080p', 'higgsfield_bitrate_mode', 'standard', 'generate_audio', true
  ), 10000 + duration.seconds
from (values (15), (30)) as duration(seconds)
cross join lateral (
  select credits_cost, duration_seconds from public.video_templates
  where is_active and generation_config->>'higgsfield_model' = 'seedance_2_5'
    and generation_config->>'workflow' = 'single_30s_all_references'
  order by created_at, id limit 1
) reference
on conflict (slug) do nothing;

do $$ begin
  if (select count(*) from public.video_templates where slug in ('prompt-film-15s', 'prompt-film-30s')) <> 2 then
    raise exception 'Seedance 2.5 reference pricing is required for prompt films';
  end if;
end $$;

create or replace function public.get_prompt_video_options()
returns table(duration_seconds integer, credits_cost integer, min_photos integer, max_photos integer)
language sql stable security invoker set search_path = ''
as $$
  select t.duration_seconds, q.credits_cost, t.min_photos, t.max_photos
  from public.video_templates t
  cross join lateral public.get_video_pricing(t.id) q
  where t.slug in ('prompt-film-15s', 'prompt-film-30s') and t.is_active
    and q.resolution = '1080p'
  order by t.duration_seconds;
$$;
revoke all on function public.get_prompt_video_options() from public, anon;
grant execute on function public.get_prompt_video_options() to authenticated;

-- This restricted entry point wraps the existing atomic subscription/trial,
-- wallet debit, project/photo snapshot and ledger transaction. Definer rights
-- are needed only to invoke the internal queue function, not to bypass tenancy.
create or replace function public.queue_prompt_video_project(
  target_workspace_id bigint, target_listing_id bigint, user_prompt text,
  target_aspect_ratio text, target_duration integer, expected_credits integer, request_id uuid
)
returns public.video_projects
language plpgsql security definer set search_path = ''
as $$
declare
  result public.video_projects;
  recipe public.video_templates;
  photo_ids bigint[];
  actual_cost integer;
  normalized_prompt text := btrim(user_prompt);
  listing_address text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not private.is_workspace_member(target_workspace_id) then raise exception 'Workspace access denied'; end if;
  if request_id is null then raise exception 'Request id required'; end if;
  if normalized_prompt is null or char_length(normalized_prompt) not between 1 and 2000 then
    raise exception 'Describe your video in 1–2,000 characters';
  end if;
  if target_duration is null or target_duration not in (15, 30) then raise exception 'Choose a 15- or 30-second video'; end if;
  if target_aspect_ratio is null or target_aspect_ratio not in ('9:16', '16:9', '1:1', '4:3', '3:4', '21:9') then
    raise exception 'Unsupported aspect ratio';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text || request_id::text, 0));
  select * into result from public.video_projects where created_by = auth.uid() and creation_request_id = request_id;
  if found then
    if result.workspace_id is distinct from target_workspace_id or result.listing_id is distinct from target_listing_id
      or result.output_format is distinct from target_aspect_ratio or result.duration_seconds is distinct from target_duration
      or result.template_prompt_snapshot->>'workflow' is distinct from 'prompt_property_film'
      or result.template_prompt_snapshot->>'user_prompt' is distinct from normalized_prompt then
      raise exception 'Request already used for different settings';
    end if;
    return result;
  end if;

  select address_line1 into listing_address from public.listings
  where id = target_listing_id and workspace_id = target_workspace_id for share;
  if not found then raise exception 'Listing not found in this workspace'; end if;
  select * into recipe from public.video_templates
  where slug = 'prompt-film-' || target_duration || 's' and is_active for share;
  if not found then raise exception 'Prompt video creation is currently unavailable'; end if;
  perform 1 from public.video_resolution_pricing where resolution = '1080p' for share;
  select q.credits_cost into actual_cost from public.get_video_pricing(recipe.id) q where q.resolution = '1080p';
  if actual_cost is null then raise exception 'Video pricing unavailable'; end if;
  if expected_credits is distinct from actual_cost then raise exception 'Price changed. Review the updated cost and try again.'; end if;

  -- Select every photo on the server in the saved mapping order. No client can
  -- supply another listing's references or silently truncate a property's route.
  select array_agg(p.id order by p.sort_order, p.id) into photo_ids
  from (select id, sort_order from public.listing_photos where listing_id = target_listing_id for share) p;
  if coalesce(cardinality(photo_ids), 0) < recipe.min_photos then raise exception 'Add at least one photo to this listing first'; end if;
  if cardinality(photo_ids) > recipe.max_photos then raise exception 'A prompt video supports up to 30 listing photos'; end if;

  result := public.queue_video_project(target_workspace_id, target_listing_id, recipe.id,
    left('Custom film — ' || listing_address, 160), photo_ids, target_aspect_ratio, '1080p');
  update public.video_projects set creation_request_id = request_id,
    template_prompt_snapshot = template_prompt_snapshot || jsonb_build_object(
      'user_prompt', normalized_prompt, 'workflow', 'prompt_property_film',
      'prompt_skill_version', 'real-estate-ai-video-v1',
      'higgsfield_model', 'seedance_2_5', 'higgsfield_mode', 'omni_reference',
      'higgsfield_resolution', '1080p', 'higgsfield_bitrate_mode', 'standard', 'generate_audio', true,
      'reference_count', cardinality(photo_ids)
    )
  where id = result.id returning * into result;
  return result;
end;
$$;
revoke all on function public.queue_prompt_video_project(bigint,bigint,text,text,integer,integer,uuid) from public, anon, authenticated;
grant execute on function public.queue_prompt_video_project(bigint,bigint,text,text,integer,integer,uuid) to authenticated;

-- Custom recipes must enter through their own validated prompt path. Retain the
-- existing curated-template queue behavior, locks and idempotency otherwise.
create or replace function public.queue_priced_video_project(
  target_workspace_id bigint, target_listing_id bigint, target_template_id bigint,
  project_title text, selected_photo_ids bigint[], target_aspect_ratio text,
  target_resolution text, expected_credits integer, request_id uuid
)
returns public.video_projects language plpgsql security definer set search_path = ''
as $$
declare result public.video_projects; actual_cost integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not private.is_workspace_member(target_workspace_id) then raise exception 'Workspace access denied'; end if;
  if exists (select 1 from public.video_templates where id = target_template_id and generation_config->>'entry_point' = 'prompt') then
    raise exception 'Use the prompt composer to create this video';
  end if;
  if request_id is null then raise exception 'Request id required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text || request_id::text, 0));
  select * into result from public.video_projects where created_by = auth.uid() and creation_request_id = request_id;
  if found then
    if result.workspace_id <> target_workspace_id or result.listing_id <> target_listing_id
      or result.template_id <> target_template_id or result.output_format <> target_aspect_ratio
      or result.template_prompt_snapshot->>'higgsfield_resolution' <> target_resolution then
      raise exception 'Request already used for different settings';
    end if;
    return result;
  end if;
  perform 1 from public.video_resolution_pricing where resolution = target_resolution for share;
  perform 1 from public.video_templates where id = target_template_id for share;
  select q.credits_cost into actual_cost from public.get_video_pricing(target_template_id) q where q.resolution = target_resolution;
  if actual_cost is null then raise exception 'Video pricing unavailable'; end if;
  if expected_credits is distinct from actual_cost then raise exception 'Price changed. Review the updated cost and try again.'; end if;
  result := public.queue_video_project(target_workspace_id,target_listing_id,target_template_id,project_title,selected_photo_ids,target_aspect_ratio,target_resolution);
  update public.video_projects set creation_request_id = request_id where id = result.id returning * into result;
  return result;
end;
$$;

notify pgrst, 'reload schema';
commit;
