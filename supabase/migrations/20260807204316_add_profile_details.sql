begin;

alter table public.profiles
  add column if not exists bio text check (bio is null or char_length(bio) <= 280),
  add column if not exists job_title text check (job_title is null or char_length(job_title) <= 100),
  add column if not exists company_name text check (company_name is null or char_length(company_name) <= 120);

commit;
