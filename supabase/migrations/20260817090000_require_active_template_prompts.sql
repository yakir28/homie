begin;

-- Active Explore templates must carry their generation recipe. queue_video_project
-- snapshots this value into video_projects, so every user generation keeps using
-- the exact prompt/configuration selected in Explore even if the template changes.
alter table public.video_templates
  add constraint active_video_templates_require_generation_config
  check (not is_active or generation_config <> '{}'::jsonb) not valid;

commit;
