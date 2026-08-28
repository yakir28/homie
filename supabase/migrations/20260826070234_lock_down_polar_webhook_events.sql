create policy payment_webhook_events_deny_clients
on public.payment_webhook_events
for all
to anon, authenticated
using (false)
with check (false);
