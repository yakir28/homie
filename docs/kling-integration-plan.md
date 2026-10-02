# Kling direct API integration plan

Status (2026-09-23): adapter implemented, live authentication verified, and activation migration applied. All 11 active templates use Kling for new jobs. A local Kling-only worker is running; existing projects keep their original providers. No paid render has been submitted or verified.
Researched 2026-09-22. Assumption: requested output is 1080p, 30 seconds.

## Recommended first release

Use Kling 3.0 image-to-video at 1080p, without native audio. Keep music as a single separately licensed soundtrack during final assembly. This is a recommendation, not an enabled setting. Evaluate Turbo / Omni separately if native audio or multiple reference inputs are needed.

Generate separate photo-grounded shots and assemble a 30-second output using the existing FFmpeg + R2 pipeline. For a six-photo tour, start with six 5-second clips, maintaining the saved photo order. Do not generate connections between rooms that the photos do not establish. The model guide documents 3–15-second outputs; verify the selected API endpoint's exact duration and input limits before coding requests. Do not send the current single-30-second request unchanged.

## Existing implementation and required changes

1. `scripts/video-worker.mjs`: introduce a provider adapter with submit/query/download operations. Route new Kling projects through it; retain the original provider for existing jobs. Keep credentials solely in the server worker.
2. Replace the single-film assumption in `lib/real-estate-video-prompt.mjs` for Kling. Compile the Director conversation, saved plan, room mapping, reference order and template into per-shot prompts. Enforce duration, reference-count, resolution and aspect-ratio limits before charging or queueing. Do not silently omit photos; too many photos for the duration require a longer plan or explicit user selection. Update Director's model-specific capability instructions and queue snapshots too.
3. Confirm the account's regional API and protocol in its console. The current official Quick Start names `api-singapore.klingai.com` and a single API key passed as `Authorization: Bearer <key>`. AccessKey/SecretKey JWT instructions describe the legacy protocol. Do not mix legacy/new endpoint schemas or guess a Turbo model identifier.
4. Persist each provider task ID immediately after submission, before polling. Resume existing tasks after worker restarts. Do not blindly retry task-creation POST requests after timeouts: reconcile by the provider's supported external task identifier first. Bound concurrency, polling, timeout and retry budgets.
5. Preserve existing project/shot status reporting. Normalize clips (frame dimensions, frame rate, audio streams) before stitching, verify actual 1080p output and exact final duration, then copy to private R2 using existing playback authorization.
6. Record provider, model, billable generated seconds, rate snapshot, task IDs, and estimated/actual provider spend separately from Homie customer credits. Reconcile failures/refunds; do not automatically change subscription prices.
7. Tests: request validation, Bearer-key/auth errors without secret leakage, polling terminal states, restart recovery, unknown submission outcomes, ordered shot planning, 30-second composition, aspect ratios, native-audio on/off, and existing-provider compatibility. Mocked tests first, then a small explicitly selected paid smoke test, then one full tour after cost is reviewed.

## Credentials

`video-worker.env` is ignored by Git and has local owner-only permissions. KLING_API_KEY is configured locally and has passed authentication; only an empty placeholder is documented in `video-worker.env.example`. Do not place secrets in chat, client bundles, NEXT_PUBLIC variables, source control, logs or screenshots. Production requires the same secrets in the worker host's secret store; editing this local file does not configure production.

## Verified API list prices

Source: https://kling.ai/dev/pricing (read in the browser on 2026-09-22).
API resource units are different from creative-studio subscription credits and Homie credits. List price is $0.14 per API unit.

| Model / mode | 1080p unit rate | USD per generated second | 30 generated seconds |
|---|---:|---:|---:|
| Kling 3.0, no native audio | 0.8 units/s | $0.112 | $3.36 |
| Kling 3.0, native audio, no voice control | 1.2 units/s | $0.168 | $5.04 |
| Kling 3.0 Turbo, native audio | 1 unit/s | $0.14 | $4.20 |
| Kling 3.0 Omni, no video input, no native audio | 0.8 units/s | $0.112 | $3.36 |
| Kling 3.0 Omni, no video input, native audio | 1 unit/s | $0.14 | $4.20 |

Example: six 5-second silent clips = 6 × 5 × 0.8 × $0.14 = $3.36.
If two 5-second clips must be regenerated, total spend = 40 × $0.112 = $4.48.
If 30 photos each require 3 generated seconds, 90 generated seconds cost $10.08 even if edited down to a 30-second final video. Budget by generated duration, not export duration. Dissolve overlaps may also require additional generated footage.

These figures exclude retries, editing/compute, storage/egress, music/voice services, tax and unused prepaid balance. The displayed standard package is $700 for 5,000 units with 180-day expiry. Larger displayed packages discount the unit price to $0.126; calculate using the actual purchased package. Trial plan is available but its price was not inspected. No purchase or paid generation was made.

## Primary references

- Official API pricing: https://kling.ai/dev/pricing
- Official VIDEO 3.0 model guide (3–15-second generation): https://kling.ai/quickstart/klingai-video-3-model-user-guide
- Developer documentation: https://kling.ai/document-api
- Current authentication and regional API host: https://kling.ai/document-api/guides/get-started/quick-start
