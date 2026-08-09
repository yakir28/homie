begin;

alter table public.video_projects
  add column if not exists template_prompt_snapshot jsonb not null default '{}'::jsonb;

update public.video_templates
set generation_config = jsonb_build_object(
  'version', 1,
  'model', 'seedance_2_0',
  'resolution', '720p',
  'base_prompt', concat(
    'Create a polished ', lower(style_label),
    ' real-estate film that matches the selected template. Keep a stable horizon, controlled cinematic camera motion, natural depth, balanced exposure, and a cohesive visual rhythm. The property itself must remain authentic.'
  ),
  'preservation_prompt',
    'Treat every supplied property image as ground truth. Preserve the exact architecture, room proportions, doors, windows, furniture, materials, landscaping, and lighting. Do not invent rooms, openings, floors, decor, text, people, or structural transitions that are not visible in the references.',
  'shots', case slug
    when 'quick-cuts' then jsonb_build_array(
      jsonb_build_object('role','hook','duration',3,'prompt','Open immediately on the strongest supplied image with a crisp, subtle push-in.'),
      jsonb_build_object('role','interior','duration',3,'prompt','Create a clean editorial reveal of the next supplied space; favor energy over simulated traversal.'),
      jsonb_build_object('role','feature','duration',3,'prompt','Highlight the strongest architectural or lifestyle feature with one concise camera move.'),
      jsonb_build_object('role','closing','duration',3,'prompt','Finish on the best hero frame with a controlled ease-out.')
    )
    when 'listing-ready' then jsonb_build_array(
      jsonb_build_object('role','arrival','duration',5,'prompt','Present the exterior or opening view clearly with a restrained push-in.'),
      jsonb_build_object('role','interior','duration',5,'prompt','Reveal the principal interior without changing its layout or proportions.'),
      jsonb_build_object('role','closing','duration',5,'prompt','End on the strongest remaining property feature in a clean listing-ready composition.')
    )
    else jsonb_build_array(
      jsonb_build_object('role','arrival','duration',6,'prompt','Begin on the strongest opening image with a slow confident push toward its architectural focal point.'),
      jsonb_build_object('role','interior_reveal','duration',6,'prompt','Glide through the supplied main interior references with calm parallax and no invented spatial connection.'),
      jsonb_build_object('role','feature','duration',6,'prompt','Reveal the strongest feature room or detail with one elegant, restrained camera move.'),
      jsonb_build_object('role','lifestyle','duration',6,'prompt','Build warmth and atmosphere from the supplied imagery while preserving all visible materials and lighting.'),
      jsonb_build_object('role','closing','duration',6,'prompt','Resolve on the strongest final hero view and ease gently to a composed still frame.')
    )
  end
)
where is_active = true;

create or replace function public.queue_video_project(
  target_workspace_id bigint,
  target_listing_id bigint,
  target_template_id bigint,
  project_title text,
  selected_photo_ids bigint[]
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
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'Workspace access denied';
  end if;
  if not exists (
    select 1 from public.listings
    where id = target_listing_id and workspace_id = target_workspace_id
  ) then
    raise exception 'Listing not found in this workspace';
  end if;

  select * into selected_template
  from public.video_templates
  where id = target_template_id and is_active = true;
  if not found then raise exception 'Template is unavailable'; end if;

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
  where workspace_id = target_workspace_id
    and balance >= selected_template.credits_cost;
  if not found then raise exception 'Not enough credits'; end if;

  insert into public.video_projects (
    workspace_id, listing_id, template_id, created_by, title, status,
    output_format, duration_seconds, credits_cost, template_prompt_snapshot
  ) values (
    target_workspace_id, target_listing_id, target_template_id, current_user_id,
    left(coalesce(nullif(trim(project_title), ''), selected_template.name), 200),
    'queued', selected_template.format, selected_template.duration_seconds,
    selected_template.credits_cost, selected_template.generation_config
  ) returning * into created_project;

  insert into public.video_project_photos (video_project_id, listing_photo_id, sort_order)
  select created_project.id, photo_id, ordinality - 1
  from unnest(selected_photo_ids) with ordinality as picked(photo_id, ordinality);

  insert into public.credit_ledger (
    workspace_id, video_project_id, amount, entry_type, description, idempotency_key, created_by
  ) values (
    target_workspace_id, created_project.id, -selected_template.credits_cost,
    'generation', concat('Video generation: ', created_project.title),
    concat('video-project:', created_project.id, ':generation'), current_user_id
  );

  return created_project;
end;
$$;

revoke all on function public.queue_video_project(bigint, bigint, bigint, text, bigint[]) from public, anon;
grant execute on function public.queue_video_project(bigint, bigint, bigint, text, bigint[]) to authenticated;

commit;
