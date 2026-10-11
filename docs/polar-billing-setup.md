# Polar billing connection

Organization: Homie (`kotav`, `99bea39c-a734-472a-90e0-31cf4abd93bc`).

The six recurring products are configured in production Polar, with IDs saved in
ignored `.env.local`. Monthly USD prices: Starter 49, Pro 129, Business 349.
Annual totals: Starter 490, Pro 1290, Business 3490.

The organization token, webhook secret and product IDs stay outside Git.
`POLAR_SERVER=production` is set locally. Local checkout uses real production
products: opening checkout does not charge, but submitting payment would.

Webhook endpoint: `https://try-homie.com/api/webhooks/polar`.
Endpoint ID: `791ddfe0-981c-4b20-8fdd-0519c2208734`.
Its event list is intentionally empty until the code and configuration are deployed.

Verified: organization access, all six product creations, Starter checkout creation
at USD 49 (no payment submitted), local signed webhook 202, invalid signature 403.

Before enabling live billing:
- Validate and apply `20261008091424_fix_polar_allowance_event_order.sql`. It uses
  the unique allowance ledger key so a subscription snapshot arriving before the
  allowance event cannot swallow the grant, and replay cannot replenish credits.
- Deploy the webhook compatibility change and supply the Polar environment
  settings plus the existing Supabase server key to the actual Cloudflare runtime.
- Subscribe the endpoint to the subscription lifecycle events handled by the route.
- Verify a full sandbox payment, credit grant, duplicate delivery, renewal and
  cancellation before declaring the entire payment lifecycle verified.

The $1 introductory purchase and one-time credit top-ups are not connected by the
existing recurring-subscription integration and remain separate work.

## Sandbox preparation (2026-10-08)

Sandbox organization `kotev-ai` (`632077ea-34ce-4947-9643-6784cb1d3713`)
was verified with its separate token. All six subscription products now exist
in sandbox at the same prices. Their IDs are stored as
`POLAR_SANDBOX_PRODUCT_*` in ignored `.env.local`.
A Starter checkout was created successfully (open, USD 49); no payment submitted.

The application now selects `POLAR_SANDBOX_*` credentials, product IDs and
webhook secret whenever `POLAR_SERVER=sandbox`, with no fallback to production.
Configuration isolation and webhook signature tests pass. Local configuration
still selects production; switching awaits an isolated database/webhook test
setup so test events cannot grant real workspace credits. Sandbox webhook,
completed payment, fulfillment and one-time purchases remain unverified.

## Readiness audit (2026-10-10)

Confirmed active DB plans match local pricing: Starter $49 / 150 credits,
Pro $129 / 400 credits, Business $349 / 1,000 credits. Annual prices remain
$490 / $1,290 / $3,490. Updated all six live and sandbox product descriptions
and metadata to reflect credit allowances and per-second resolution pricing.
Created matching live and sandbox one-time products: 60/$22, 150/$49,
300/$99, 600/$195. IDs saved as POLAR_[SANDBOX_]PRODUCT_CREDITS_<quantity>
in ignored .env.local. These products are NOT yet wired to checkout/fulfillment.

Polar dashboard Finance > Account shows Account approved and Identity verified,
but Payout Account still offers Continue with Account Setup. Owner must complete
that setup. Production organization API reports active. Production checkout
creation succeeded, open at USD 49; no payment was submitted.

Launch blockers verified directly:
- Live POST /api/webhooks/polar returns 503: Webhook is not configured.
- Homie Polar webhook endpoint has an empty subscribed event list.
- Top-up UI still displays a coming-next message; no paid-order fulfillment.
- $1 first-video checkout is disabled, while landing page advertises it.
- Full sandbox payment through wallet fulfillment/replay has not passed yet.

Do not treat product synchronization or checkout creation as end-to-end readiness.
No app deployment or database mutation performed during this audit.

## Local subscription fulfillment hardening (2026-10-10)

The webhook now validates subscription payloads, uses their actual status and
handles active `subscription.updated` snapshots (including renewals). Trialing,
unpaid and past-due snapshots do not grant a paid allowance. Scheduled
cancellation preserves active access; canceled status expires access.

The pending migration now includes `polar_event_at` and an event timestamp RPC
argument. Workspace/wallet row locks serialize delivery, old snapshots cannot
replace newer state, and the ledger prevents replenishing spent credits on a
same-period replay. Missing wallets fail transactionally for retry. Migration
and route must be deployed together; old RPC signature is removed. No production
migration has been applied as part of this change.

Validation: six Node tests and TypeScript check pass. An in-memory PostgreSQL
(PGlite 0.3.14) run of the actual migration passes initial allowance, duplicate
and same-period replay, renewal, stale revocation, expiry, stale reactivation,
annual 12x allowance and failure rollback. Reproduce with
`PGLITE_MODULE=/path/to/pglite/dist/index.js node scripts/check-polar-db.mjs`.

This validates subscription allowances, not one-time credit purchases or refunds.
Top-up fulfillment must preserve bought credits separately before it is enabled.
Live secrets, webhook event subscriptions, coordinated migration/deployment and
end-to-end sandbox delivery remain pending. The checkout return message now says
payment is being verified rather than claiming payment succeeded from URL alone.

## Production activation (2026-10-10)

Applied `harden_polar_subscription_delivery` to production. Verified the new
13-argument RPC is executable by service_role only (not anon/authenticated).
Uploaded production billing secrets to the Cloudflare runtime without replacing
existing unrelated secrets. Worker version: 106cf801-f564-44f4-aaec-76f8ecbfff60.
All 123 Node tests passed before release.

Enabled Homie endpoint events: subscription.created, active, updated, canceled,
uncanceled, past_due and revoked. Verified endpoint enabled and subscriptions
persisted. Signed unknown-event probe on https://try-homie.com/api/webhooks/polar
returned 202; invalid signature returned 403. These probes do not change wallets.
The live homepage returned 200 with new 150-credit content; sampled JS/CSS assets
returned 200. Direct Vercel deployment was denied (Not authorized); the existing
Vercel proxy serves the updated Cloudflare application successfully.

No actual payment was submitted and end-to-end paid checkout through fulfillment
is not yet verified. Payout account setup remains owner action. One-time top-ups
and the $1 offer remain unconnected and must not be advertised as ready.

## One-time credit purchases — local implementation (2026-10-10)

Added shared credit catalog (60/$22, 150/$49, 300/$99, 600/$195), authenticated
workspace-member checkout at POST /api/billing/credits, and busy-state purchase
buttons. Prices/credits are selected on the server; discounts are disabled.
Signed order.paid and order.refunded events map trusted product IDs to packs,
validate currency/net amount, and call a service-only fulfillment RPC.

Pending migration: 20261010003232_add_polar_credit_purchases.sql. It adds an
idempotent order journal and purchased wallet balance. Generation spends the
subscription allowance first. Subscription renewal/expiry preserves purchases.
Partial refunds revoke proportional credits (rounded up); spent refunded credits
become a debt against future pack purchases. Refund-before-paid and replay are
safe. Purchased credits allow 720p generation after trial usage; Pro/Business
resolution restrictions are unchanged. No $1 introductory checkout implemented.

Validated migration and fulfillment with PGlite using scripts/check-polar-db.mjs,
including purchased-credit spending, renewal/cancellation preservation, duplicate
orders, partial/full refunds, refund-before-paid, refund debt and workspace
reassignment rejection. Queue-function patch syntax is exercised with a fixture;
read-only production inspection confirms the patch anchor follows resolution
checks. Node tests cover order validation and trusted catalog selection.

Rollout (NOT performed in this local task):
1. Apply the pending credit-purchase migration after subscription hardening.
2. Deploy code, supply the four production PRODUCT_CREDITS IDs, and set
   POLAR_CREDIT_PURCHASES_ENABLED=true only when migration/code are ready.
3. Add order.paid and order.refunded to the existing endpoint's event list without
   removing subscription events. For partial refunds Polar emits order.refunded.
4. Complete an isolated sandbox checkout through wallet fulfillment before launch.

The feature flag defaults off so localhost sharing the live Supabase database
cannot accidentally sell packs before the migration is released. No live code,
database schema, products or webhook settings changed in this implementation turn.

## Local payment confirmation and cancellation UX

Checkout success URLs now include Polar's supported {CHECKOUT_ID} placeholder.
POST /api/billing/status checks authenticated workspace membership, checkout
ownership and succeeded status, a paid/unrefunded Polar order, and the local
subscription grant or fulfilled credit-order journal. The UI polls briefly and
shows the checkmark animation only after that confirmation. Pending/outage states
never claim success and advise against paying twice. Closing refreshes workspace
data. Reduced-motion users get a static checkmark.

Settings and the current-plan action now explicitly say Manage / cancel
subscription, leading to the existing secure Polar portal for final cancellation.
The local subscription model includes cancel_at_period_end so scheduled
cancellation displays an end date rather than a renewal. No cancellation was
submitted during development. Both production and sandbox tokens have orders
read access (verified HTTP 200). These UX changes have not been deployed.

## One-time purchases activated (2026-10-10)

Applied add_polar_credit_purchases to production and verified fulfillment RPC is
service-role only. Uploaded all four production product IDs and enabled
POLAR_CREDIT_PURCHASES_ENABLED on the serving Cloudflare Worker. Preserved
existing subscription events and added order.paid/order.refunded; re-read Polar
endpoint to confirm enabled state and persisted events.

Verified every live product price against the shared catalog before activation.
In-memory database lifecycle tests and nine billing tests passed again. Live
POST /api/billing/credits without authentication now returns 401 (previously
feature-disabled 503), confirming the feature is enabled and auth enforced.
No real charge submitted; a full paid checkout-to-wallet run is still not claimed.

## Paid $1 introductory offer — local implementation

Pending migration 20261010011214_paid_first_video.sql stops bootstrap credit
awards and changes First Video to a zero-allowance plan. It reclaims only exactly
30 identifiable, unspent signup credits on free-trial wallets with no manual
adjustments, preserving purchased balance. Ambiguous or spent legacy grants are
left untouched for review; lifetime credit history is retained with an adjustment.

POST /api/billing/first-video uses a service-only reservation per user AND per
workspace. Concurrent requests reuse the same checkout; expired checkout slots
can only reset after Polar confirms expiry. Ambiguous creation failures retain
the reservation and require support reconciliation rather than risking a second
charge. Completed/refunded offers cannot be bought again. The server derives
identity from auth and fulfillment matches the persisted checkout, never client
metadata. A verified $1 order grants 30 credits via the replay/refund-safe journal.

Environment flag POLAR_FIRST_VIDEO_ENABLED defaults false, with separate
POLAR_[SANDBOX_]PRODUCT_FIRST_VIDEO identifiers. Before release create one-time
USD 1 products, apply migration, configure product IDs, then enable. Existing
order.paid/refunded webhook subscriptions cover the new offer. No migration,
product or runtime changes were applied to production in this local task.

PGlite validation includes zero signup grants, reclaiming unused gifts while
preserving purchases, per-user reservations/cross-workspace restriction, and
exactly-once 30-credit grant. A real/sandbox full checkout has not yet been run.

## $20 follow-up pack — local implementation

After a verified $1 introductory order and a successfully completed video created
by that purchaser in the same workspace after the credit grant, the first-video
card becomes a one-time $20 / 90-credit pack (about three 30s videos at 720p).
The card polls eligibility while visible. A paid introduction still awaiting its
first completed video offers a create action, not another $1 checkout. The pack
is repeatable after eligibility; it never starts an automatic subscription.

Eligibility comes from service-only first_video_offer_state and is checked again
by the credit checkout endpoint. Failed/in-progress/older videos do not qualify;
refunded introductory purchases do not qualify. The generic top-up modal retains
its existing packs; this special pack is offered in the former introductory card.

Pending migration: 20261010011512_post_intro_video_pack.sql, after paid_first_video.
Before rollout create live/sandbox one-time $20 products and configure
POLAR_[SANDBOX_]PRODUCT_CREDITS_90. Existing order fulfillment and refund handling
cover the new pack. No production changes performed for this request.

## Intro and follow-up published (2026-10-10)

Applied paid_first_video and post_intro_video_pack in production. Created and
verified $1/30-credit and $20/90-credit one-time products in live and sandbox
Polar; IDs saved in ignored .env.local. Activated production first-video flag
and product IDs on Worker e447bb30-e20d-4cf1-8062-feeb9b717c6a.
126 tests and isolated database scenarios passed. Live first-video and offer-state
endpoints reject unauthenticated access with 401; deployed client includes $1,
create-first-video and $20 states. Confirmed introductory allowance is zero and
all three new RPCs are service-only. No real payment or end-to-end paid video
creation performed during release verification.
