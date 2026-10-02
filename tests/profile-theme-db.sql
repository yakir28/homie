begin;
select set_config('request.jwt.claim.sub', (select id::text from public.profiles order by created_at limit 1), true);
set local role authenticated;
do $$
declare saved_theme text; changed integer;
begin
  if auth.uid() is null then raise exception 'A profile is required for this smoke test'; end if;
  update public.profiles set theme = 'light' where id = auth.uid();
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'Own profile update failed'; end if;
  select theme into saved_theme from public.profiles where id = auth.uid();
  if saved_theme <> 'light' then raise exception 'Light preference was not restored'; end if;
  update public.profiles set theme = 'dark' where id = auth.uid();
  select theme into saved_theme from public.profiles where id = auth.uid();
  if saved_theme <> 'dark' then raise exception 'Dark preference was not restored'; end if;
  update public.profiles set theme = 'light' where id <> auth.uid();
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Cross-user profile access permitted'; end if;
  begin
    update public.profiles set theme = 'invalid' where id = auth.uid();
    raise exception 'Invalid theme accepted';
  exception when check_violation then null;
  end;
end $$;
rollback;
select 'Theme save/load, allowed values, and account isolation passed; test changes rolled back.' as result;
