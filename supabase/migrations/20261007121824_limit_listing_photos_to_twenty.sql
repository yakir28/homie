-- Existing oversized albums remain intact. Enforce capacity on additions/moves.
create or replace function private.enforce_listing_photo_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if TG_OP = 'UPDATE' then
    if NEW.listing_id = OLD.listing_id then return NEW; end if;
  end if;
  -- Serialize additions to the same home, including separate browser sessions.
  perform id from public.listings where id = NEW.listing_id for update;
  if (select count(*) from public.listing_photos where listing_id = NEW.listing_id) >= 20 then
    raise exception 'Each home can have up to 20 photos. Remove a photo before adding another.' using errcode = '23514';
  end if;
  return NEW;
end;
$$;
revoke all on function private.enforce_listing_photo_limit() from public;
create trigger enforce_listing_photo_limit
before insert or update of listing_id on public.listing_photos
for each row execute function private.enforce_listing_photo_limit();
