begin;

delete from public.video_templates
where slug in (
  'golden-hour-flow',
  'forest-morning-flow',
  'skyline-after-dark',
  'sunset-light-sweep',
  'misty-cabin-orbit',
  'blue-hour-city-pulse'
);

commit;
