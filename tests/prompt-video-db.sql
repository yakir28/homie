-- Integration smoke test. Requires one paid workspace with a listing of 1–30
-- photos and enough credits. All queued projects and debits are rolled back.
begin;
do $$
declare fixture record;
begin
  select m.user_id, m.workspace_id, l.id as listing_id into fixture
  from public.workspace_members m
  join public.credit_wallets w on w.workspace_id=m.workspace_id
  join public.subscriptions s on s.workspace_id=m.workspace_id
  join public.plans p on p.id=s.plan_id
  join public.listings l on l.workspace_id=m.workspace_id
  where p.slug <> 'free-trial'
    and w.balance >= (select max(credits_cost) from public.get_prompt_video_options())
    and (select count(*) from public.listing_photos where listing_id=l.id) between 1 and 30
  order by l.id limit 1;
  if not found then raise exception 'Prompt video smoke test requires a funded paid workspace with photos'; end if;
  perform set_config('request.jwt.claim.sub', fixture.user_id::text, true);
  perform set_config('prompt_test.workspace_id', fixture.workspace_id::text, true);
  perform set_config('prompt_test.listing_id', fixture.listing_id::text, true);
end $$;
set local role authenticated;
do $$
declare
  test_workspace_id bigint := current_setting('prompt_test.workspace_id')::bigint;
  test_listing_id bigint := current_setting('prompt_test.listing_id')::bigint;
  quote integer;
  before_balance integer;
  after_balance integer;
  request_key uuid := gen_random_uuid();
  result public.video_projects;
  replay public.video_projects;
  original_ids bigint[];
  queued_ids bigint[];
begin
  if has_function_privilege('anon', 'public.queue_prompt_video_project(bigint,bigint,text,text,integer,integer,uuid)', 'execute') then
    raise exception 'Anonymous queue access must be revoked';
  end if;
  select credits_cost into strict quote from public.get_prompt_video_options() where duration_seconds=30;
  select balance into strict before_balance from public.credit_wallets w where w.workspace_id=test_workspace_id;
  begin
    perform public.queue_prompt_video_project(-1, test_listing_id, 'Warm tour', '16:9', 30, quote, gen_random_uuid());
    raise exception 'Workspace authorization failed';
  exception when others then
    if sqlerrm <> 'Workspace access denied' then raise; end if;
  end;
  begin
    perform public.queue_prompt_video_project(test_workspace_id, -1, 'Warm tour', '16:9', 30, quote, gen_random_uuid());
    raise exception 'Listing authorization failed';
  exception when others then
    if sqlerrm <> 'Listing not found in this workspace' then raise; end if;
  end;
  begin
    perform public.queue_prompt_video_project(test_workspace_id, test_listing_id, 'Warm tour', '16:9', 30, quote+1, gen_random_uuid());
    raise exception 'Stale pricing was accepted';
  exception when others then
    if sqlerrm not like 'Price changed.%' then raise; end if;
  end;
  begin
    perform public.queue_prompt_video_project(test_workspace_id, test_listing_id, '  ', '16:9', 30, quote, gen_random_uuid());
    raise exception 'Empty prompt was accepted';
  exception when others then
    if sqlerrm <> 'Describe your video in 1–2,000 characters' then raise; end if;
  end;
  begin
    perform public.queue_prompt_video_project(test_workspace_id, test_listing_id, 'Warm tour', 'auto', 30, quote, gen_random_uuid());
    raise exception 'Unsupported format was accepted';
  exception when others then
    if sqlerrm <> 'Unsupported aspect ratio' then raise; end if;
  end;
  begin
    perform public.queue_prompt_video_project(test_workspace_id, test_listing_id, 'Warm tour', '16:9', 45, quote, gen_random_uuid());
    raise exception 'Unsupported duration was accepted';
  exception when others then
    if sqlerrm <> 'Choose a 15- or 30-second video' then raise; end if;
  end;
  result := public.queue_prompt_video_project(test_workspace_id, test_listing_id, '  Warm tour  ', '16:9', 30, quote, request_key);
  replay := public.queue_prompt_video_project(test_workspace_id, test_listing_id, 'Warm tour', '16:9', 30, quote, request_key);
  if replay.id <> result.id then raise exception 'Retry created a duplicate project'; end if;
  select balance into strict after_balance from public.credit_wallets w where w.workspace_id=test_workspace_id;
  if before_balance-after_balance <> quote then raise exception 'The wallet was not debited exactly once'; end if;
  if result.status <> 'queued' or result.credits_cost <> quote or result.duration_seconds <> 30
    or result.template_prompt_snapshot->>'user_prompt' <> 'Warm tour'
    or result.template_prompt_snapshot->>'higgsfield_model' <> 'seedance_2_5'
    or result.template_prompt_snapshot->>'higgsfield_mode' <> 'omni_reference'
    or result.template_prompt_snapshot->>'prompt_skill_version' <> 'real-estate-ai-video-v1' then
    raise exception 'Project recipe snapshot is incorrect';
  end if;
  select array_agg(p.id order by p.sort_order,p.id) into original_ids from public.listing_photos p where p.listing_id=test_listing_id;
  select array_agg(p.listing_photo_id order by p.sort_order) into queued_ids from public.video_project_photos p where p.video_project_id=result.id;
  if original_ids is distinct from queued_ids then raise exception 'The saved photo order changed'; end if;
  begin
    perform public.queue_prompt_video_project(test_workspace_id, test_listing_id, 'Different tour', '16:9', 30, quote, request_key);
    raise exception 'A retry changed its prompt';
  exception when others then
    if sqlerrm <> 'Request already used for different settings' then raise; end if;
  end;
  begin
    perform public.queue_priced_video_project(test_workspace_id, test_listing_id, result.template_id, 'Bypass', original_ids, '16:9', '1080p', quote, gen_random_uuid());
    raise exception 'Curated queue accepted a prompt recipe without a prompt';
  exception when others then
    if sqlerrm <> 'Use the prompt composer to create this video' then raise; end if;
  end;
end $$;
rollback;
select 'Prompt queue: authorization, pricing, idempotency, photo order and snapshot checks passed; all test writes rolled back.' as result;
