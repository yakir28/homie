begin;

alter table public.video_templates
  drop constraint if exists video_templates_format_check;

alter table public.video_templates
  add constraint video_templates_format_check
  check (format in ('9:16', '16:9', '1:1', '4:3', '3:4', '21:9'));

alter table public.video_projects
  drop constraint if exists video_projects_output_format_check;

alter table public.video_projects
  add constraint video_projects_output_format_check
  check (output_format in ('9:16', '16:9', '1:1', '4:3', '3:4', '21:9'));

commit;
