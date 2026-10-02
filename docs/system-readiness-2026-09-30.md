# Homie readiness audit — 2026-09-30

## Status
The automated checks and live queue validation pass. Full end-to-end readiness is **not yet confirmed**: no paid Kling generation was submitted, Director's local conversation key is missing, and the generation worker is not currently running.

## Verified
- Production build passes; TypeScript check passes. The separate CRM build (including its own TypeScript check) also passes.
- 56 automated checks pass: Kling requests/recovery, all template planners, Director request/selection validation, prompt plans, upload regression, actual FFmpeg assembly with mixed audio and image sizes, rendered public pages, and API input/auth guards.
- All 11 active database recipes pass the Kling planner audit and have individual creative directions.
- Kling live authentication succeeds without generating a video.
- Live database queue checks pass for nine templates plus Director 15s and 30s. Checked stored provider = Kling, photo associations, current quoted credit debit, and duplicate-request idempotency.
- Queue tests were rolled back, including wallet and project changes. No requests were visible to workers. Database sequences can have harmless gaps from rolled-back inserts.
- All public tables have RLS enabled. This is not a full cross-account policy penetration test.
- Existing R2 object videos/78/1/version-1.mp4 was retrieved through authenticated Wrangler access and probed: 720×1280, video + audio, 25.024 seconds. This verifies an existing legacy artifact, not a new Kling output.
- Browser /app correctly redirects an unauthenticated session to /login.

## Fixed
- Replaced obsolete starter-page tests with Homie rendered-page and API guard coverage.
- Default npm test now includes all test files after the production build.
- Malformed/null video URL request bodies now return 400 instead of throwing a server error.
- Removed a credential-looking Kling key from video-worker.env.example and restored the correct base URL placeholder configuration. Rotate that key before paid testing; editing an example file does not revoke it or erase historical copies.
- Documented server-only OpenAI configuration in .env.example.
- Added generated Cloudflare runtime declarations, corrected browser interval typing and captured the authenticated access token before the nested loading callback.
- Hardened Director/import error parsing for unknown JSON and typed the optional D1 binding explicitly.
- Kept the separate CRM project out of the main app TypeScript compilation; verified its own build instead. Added npm run typecheck and npm run types:worker (the latter uses the built Worker configuration).

## Before the live tests
1. Configure OPENAI_API_KEY for the web server and restart it. Local .env.local and video-worker.env do not currently contain this key. Kling generates footage; OpenAI drives the Director conversation.
2. Rotate the Kling key found in the example file, save the replacement only in ignored server configuration, then run npm run video:kling:check.
3. Start the generation worker for the testing session: npm run video:worker -- --kling-only. Keep the computer/process awake. No always-on worker deployment was verified.
4. R2 SDK entries in video-worker.env are placeholders. The worker currently falls back to authenticated Wrangler; that session can read existing media. New final-video upload remains part of the live test. Configure real R2 credentials for an unattended deployment.
5. Sign into the test account in the testing browser. The audit browser was unauthenticated, so signed-in upload, generation, approval/download and theme flows were not exercised end-to-end.
6. Existing project 5 is queued for Higgsfield, not Kling. It was left unchanged. A Kling-only worker will skip it.
7. Review credit pricing: current 1080p quotes vary from 3 to 300 credits across templates; Director is 90/180 credits for 15/30 seconds. These are app credits, not Kling dollar costs. No pricing was changed in this audit. The test account has 898 credits, insufficient to run every template once at current quotes without a planned test allowance.

## Tomorrow's test matrix
- Account: sign in, sign out/back in; verify theme preference and workspace isolation.
- Photos: upload single/multiple images; verify thumbnail strip, active image, room mapping, reorder, saved state after refresh, and visible errors on failed uploads.
- Templates: generate once with each available template; verify template-specific opening/motion, selected image order, duration, aspect ratio and requested resolution. Check both minimum photo count and extra photos.
- Director: use an existing listing and separately uploaded photos; multi-turn changes to duration/style/aspect; edit title and document plan; generate 15s/30s; verify new versions and no duplicate charge on double click/retry.
- Queue: queued → generating → awaiting approval; progress survives refresh; failure message and controlled recovery. Stop/restart testing must confirm no duplicate provider submission.
- Result: play, seek and hear audio; compare property details to source images; approve/download; verify downloaded dimensions/duration and expired-link recovery.
- Billing: test checkout/webhook in sandbox, duplicate delivery and credit updates. No billing transaction was attempted during this audit.
- Responsive/accessibility: desktop/mobile, dark/light, keyboard focus and reduced motion.

Director chat history is currently stored on this device; cross-device chat persistence is not implemented. Video projects are stored in the database.
