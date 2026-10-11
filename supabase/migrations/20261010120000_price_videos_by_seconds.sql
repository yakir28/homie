-- Credits are priced by video length: 1 credit = 1 second at 720p, 2 credits
-- per second at 1080p (Pro and Business only). Plan allowances are sized so a
-- fully used plan keeps at least a 50% margin on Wan 3.0 Prime generation cost.
begin;

-- Every template costs its runtime in seconds at 720p.
update public.video_templates
set credits_cost = duration_seconds, updated_at = now()
where credits_cost is distinct from duration_seconds;

update public.video_resolution_pricing set multiplier = case resolution
  when '480p' then 1 when '720p' then 1 when '1080p' then 2 when '4k' then 4 else multiplier end;

-- Monthly allowances (yearly plans receive 12x through sync_polar_subscription).
update public.plans set monthly_credits = case slug
    when 'free-trial' then 30 when 'starter' then 150 when 'pro' then 400 when 'business' then 1000 else monthly_credits end,
  features = case slug
    when 'starter' then '["150 credits each month · about 5 thirty-second videos","All video templates","Zillow and Airbnb sync","720p social-ready exports"]'::jsonb
    when 'pro' then '["400 credits each month · about 13 thirty-second videos","Everything in Starter","1080p exports","Priority generation","Commercial usage"]'::jsonb
    when 'business' then '["1,000 credits each month · about 33 thirty-second videos","Shared team workspace","10 agent seats","1080p exports","Priority support"]'::jsonb
    else features end,
  updated_at = now()
where slug in ('free-trial', 'starter', 'pro', 'business');

-- The first-video trial covers one video of any template at 720p.
do $migration$
declare
  definition text := pg_get_functiondef('public.bootstrap_workspace(text)'::regprocedure);
begin
  if position('then 1 else 0 end' in definition) = 0 or position('if initial_balance = 1 then' in definition) = 0
     or position('new_workspace_id, 1, ''trial''' in definition) = 0 then
    raise exception 'Unexpected bootstrap_workspace: trial grant changed; inspect before migrating';
  end if;
  definition := replace(definition, 'then 1 else 0 end', 'then 30 else 0 end');
  definition := replace(definition, 'if initial_balance = 1 then', 'if initial_balance > 0 then');
  definition := replace(definition, 'new_workspace_id, 1, ''trial''', 'new_workspace_id, initial_balance, ''trial''');
  execute definition;
end;
$migration$;

-- Unused trials still hold the old single-unit grant; top them up to 30.
update public.credit_wallets wallets
set balance = 30, lifetime_credited = wallets.lifetime_credited + (30 - wallets.balance), updated_at = now()
from public.subscriptions subscriptions
join public.plans plans on plans.id = subscriptions.plan_id
where subscriptions.workspace_id = wallets.workspace_id
  and plans.slug = 'free-trial'
  and wallets.balance between 1 and 29
  and exists (
    select 1 from private.user_video_trials trials
    where trials.granted_workspace_id = wallets.workspace_id and trials.used_at is null
  );

-- 1080p and above is a Pro/Business feature, enforced at queue time.
do $migration$
declare
  definition text := pg_get_functiondef('public.queue_video_project(bigint,bigint,bigint,text,bigint[],text,text)'::regprocedure);
  anchor text := $anchor$  if current_plan_slug is null then raise exception 'Workspace subscription is missing'; end if;$anchor$;
begin
  if (length(definition) - length(replace(definition, anchor, ''))) / length(anchor) <> 1 then
    raise exception 'Unexpected queue_video_project: plan lookup changed; inspect before migrating';
  end if;
  execute replace(definition, anchor, anchor || $gate$
  if target_resolution in ('1080p', '4k') and current_plan_slug not in ('pro', 'business') then
    raise exception 'Upgrade to Pro to export in 1080p';
  end if;$gate$);
end;
$migration$;

-- Custom (prompt) films render at 720p so every plan can create them.
do $migration$
declare
  queue_def text := pg_get_functiondef('public.queue_prompt_video_project(bigint,bigint,text,text,integer,integer,uuid)'::regprocedure);
  options_def text := pg_get_functiondef('public.get_prompt_video_options()'::regprocedure);
begin
  if (length(queue_def) - length(replace(queue_def, '''1080p''', ''))) / length('''1080p''') <> 4
     or (length(options_def) - length(replace(options_def, '''1080p''', ''))) / length('''1080p''') <> 1 then
    raise exception 'Unexpected prompt video functions: resolution handling changed; inspect before migrating';
  end if;
  execute replace(queue_def, '''1080p''', '''720p''');
  execute replace(options_def, '''1080p''', '''720p''');
end;
$migration$;

commit;
