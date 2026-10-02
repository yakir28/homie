alter table public.profiles
  add column theme text not null default 'dark'
  constraint profiles_theme_check check (theme in ('dark', 'light'));

comment on column public.profiles.theme is 'Preferred app appearance, restored on sign-in.';
