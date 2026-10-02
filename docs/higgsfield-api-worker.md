# Higgsfield public API video provider

Activated 2026-10-01 for all 11 active recipes, including Director 15s/30s.
New projects snapshot `provider: higgsfield_api`. This is distinct from the
legacy `higgsfield` consumer CLI and the direct `kling` API. Existing projects
retain their original provider; the old queued project is not migrated or charged.

## Model and generation behavior
**Since 2026-10-02 (migration `use_wan_3_prime_video_model`): new projects use
`video_model: wan-3.0-prime` → `alibaba/wan-3.0-prime/reference-to-video`.**
Wan takes up to 10 `image_urls` and 2–30s per request at 480p/720p/1080p (no 4K;
the 4K price row is hidden and the queue rejects it). 16:9, 9:16, 1:1, 4:3 and
3:4 generate natively, so 3:4 templates are no longer letterboxed. A 30s film with
≤10 photos is one request; more photos split into chapters of ≤10. Body:
`{prompt, image_urls, duration, resolution, aspect_ratio, generate_audio}`.
Set `video_model: wan-3.0` for the cheaper non-Prime tier. Snapshots that say
`kling-o3` keep the Kling route described below.

New templates and Director projects snapshot `generation_mode: reference` and
`video_model: kling-o3`. The endpoint is `kling-video/o3/image-reference`:
`image_urls` supplies references, without first/last frame parameters. Resolution
maps to mode: 720p → std, 1080p → pro, 4k → 4k. No 480p option.

The planner uses up to 15 seconds per chapter, with a conservative application
limit of seven references per chapter. A 30s film with six photos uses two 15s
chapters; a 30-photo, 30s film uses five 6s chapters. Generated durations sum to
the requested runtime, with no overlap or extra generated seconds. Photos are
partitioned in saved order, and each chapter retains the template direction or
Director request plus opening/continuation/closing instructions. Very short
films with too many references are rejected before generation.

FFmpeg joins the chapters and stores the final film in R2. These are editorial
cuts, not a guaranteed continuous camera move. Generated audio may differ across
chapters; a continuous soundtrack is not implemented. Native ratios are 16:9,
9:16 and 1:1; other app ratios use a native generation ratio and padded export.
Existing snapshots without reference mode retain their original shot planner.
No automatic fallback to Seedance or another model is enabled.

Prepared JPEG references are uploaded with Higgsfield presigned storage URLs.
API credentials are used only at api.higgsfield.ai, never at storage URLs.
Each shot persists submission intent and a content fingerprint before generation,
then persists request ID + status URL before polling. Completed shots are reused.
A saved request resumes with GET only. A lost submission response without an ID
requires console reconciliation, preventing an accidental second paid request.
Idempotency-Key is also sent; no assumption is made about its retention window.

## Local setup
Save HF_API_KEY_ID and HF_API_KEY_SECRET in ignored video-worker.env (mode 600).
The key supplied in chat should be rotated; never put credentials in examples.
- npm run video:higgsfield:check: requests an upload URL to verify authentication;
  does not upload media or start generation.
- npm run video:audit: read-only live template audit.
- npm run video:worker: default worker, filtered to Higgsfield API projects.
- npm run video:worker:dry-run: queue inspection/planning without mutations.
- npm run video:worker:higgsfield: explicit alias for the same provider filter.
- npm test: full build and all tests.

The worker runs on this computer, not an always-on hosted service. Keep it running
for generation. The web server still needs OPENAI_API_KEY for Director chat.
Higgsfield credentials do not replace that separate conversation model.

## Verification
Live authentication, all 11 database queue routes (rolled back, no lasting credit
charges), and template planning pass. Unit coverage checks payloads across all
recipes/resolutions, submission persistence, resume, storage headers, endpoint
validation, terminal failures and transient polling retries. No paid generation
was submitted during activation; final visual quality/end-to-end export remains
a live test.

Database advisors: the same pre-existing warnings remain for authenticated
SECURITY DEFINER RPCs and disabled leaked-password protection. No new grants
were added. References:
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Official protocol/model references:
- https://docs.higgsfield.ai/docs/concepts/requests
- https://docs.higgsfield.ai/docs/concepts/file-uploads
- https://open.higgsfield.ai/models/kling-video/o3/image-reference/api-reference

## 2026-10-01 live submission correction
The first live submissions (projects 39/40) were rejected with HTTP 400 before
receiving a request ID. The model's full input JSON Schema requires
`multi_prompt` whenever `multi_shots` is true, even with intelligent shot type.
Multiple image references are independent of that flag. Each chapter now sends
`multi_shots: false`, its full `prompt` and all chapter `image_urls`; chapter
assembly remains unchanged. The official schema is saved in
`tests/fixtures/higgsfield-omni-input-schema.json` for regression checks.
Provider validation details are now retained with credentials/URLs redacted.

A deliberately invalid duration (0) was used for non-generating validation:
the original body reported missing multi_prompt; the corrected body reports
only the intentionally invalid duration. This is not proof of a successful
paid generation. Failed projects were not automatically resubmitted.

Shared documentation reviewed:
- https://docs.higgsfield.ai/docs/llms.txt
- https://docs.higgsfield.ai/docs/concepts/errors

## Accepted-request tracking correction
Project 41 passed submission but failed while validating the returned status URL,
before saving its request ID. The exact response link was not retained. The client
now keeps valid trusted status URLs and falls back to the documented HTTPS
`/requests/{request_id}/status` endpoint for untrusted provider links, persisting
the accepted ID before polling. Credentials are never sent to other origins.
Regression coverage includes HTTP, foreign-origin and credential-bearing links.
Project 41 requires its request ID from the provider console for reconciliation;
do not resubmit the missing-ID shot automatically.
