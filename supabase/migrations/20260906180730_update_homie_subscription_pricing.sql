begin;

update public.plans
set monthly_price = case slug
      when 'starter' then 49
      when 'pro' then 129
      when 'business' then 349
    end,
    updated_at = now()
where slug in ('starter', 'pro', 'business');

commit;
