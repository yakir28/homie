-- Any listing with at least one photo can create a video from any template.
alter table public.video_templates alter column min_photos set default 1;
update public.video_templates set min_photos = 1 where min_photos <> 1;
