-- New projects use Omni reference chapters; existing job snapshots are immutable.
update public.video_templates
set generation_config = generation_config || jsonb_build_object(
  'generation_mode', 'reference', 'video_model', 'kling-o3', 'reference_planner_version', 1
), updated_at = now()
where is_active and generation_config->>'provider' = 'higgsfield_api';
