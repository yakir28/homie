-- Every Higgsfield API film is generated with native audio. The worker enforces
-- this regardless of template flags; this keeps template configs consistent.
-- Existing project snapshots are immutable and are not changed.
begin;

update public.video_templates
set generation_config = generation_config || jsonb_build_object(
  'supports_generate_audio', true, 'generate_audio', true
), updated_at = now()
where generation_config->>'provider' = 'higgsfield_api';

commit;
