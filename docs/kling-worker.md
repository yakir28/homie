# Kling worker connection

Implementation: `lib/kling-client.mjs`, `lib/kling-shot-plan.mjs`, `scripts/video-worker.mjs`.

Current status (2026-09-23): authentication verified against the live Kling API. Activation migration applied: all 11 active templates route new jobs to Kling. A local worker was started with --kling-only so legacy queued jobs are not consumed. 42 automated tests passed before activation. No paid generation has been submitted; provider output quality and the complete generation-to-R2 path still require a real render. This worker runs locally and is not an always-on hosted deployment.

## Configure and activate

1. Save the full API key in ignored `video-worker.env` as `KLING_API_KEY=...`. Production needs it in the worker host's secret environment too. No NEXT_PUBLIC prefix.
2. Run `npm run video:kling:check`. This queries the task list and does not create a generation. It prints no key or task contents.
3. Deploy this worker code, then apply `supabase/migrations/20260923082536_enable_kling_video_templates.sql`. This switches new jobs for the 11 audited templates to Kling and removes unsupported 480p quotes. Existing queued/completed snapshots retain their original provider. Do not rewrite their snapshots to change providers midway through a job.
4. Start the worker using the existing `npm run video:worker` command. Both providers are supported, selected from the immutable project snapshot. Higgsfield authentication is only required when processing a legacy Higgsfield job.
5. Validate one selected small paid video before treating output quality and the provider-to-R2 path as verified. The mocked tests are not a live rendering test.

## Templates and durations

Paired/single-shot recipes preserve their authored prompt, start/end photos and shot duration. Long single-film templates use explicit per-template Kling adaptations and separate photo-grounded shots; continuous 30-second effects will have edited shot boundaries. This is an adaptation, not a claim of identical visual output to the preview. Director uses the user's brief.

Each API generation lasts 3–15 seconds. Every selected photo is retained. Extra photos become additional shots; the editor fits the generated clips into the requested final duration. For example, 30 photos can require 90 billable generated seconds even when exporting 30 seconds. Silent templates stay silent; Director currently retains native audio. Per-shot provider billing and generated duration are stored in `video_project_shots.provider_metadata`; final version metadata records total generated seconds. Existing Homie credit prices are unchanged and are not the provider's dollar prices.

Reference images are converted to JPEG and padded to the requested aspect ratio before submitting base64. This keeps all property details visible. Kling follows the first frame's shape; no unsupported aspect_ratio request property is sent. Output assembly normalizes and probes final dimensions/duration before uploading to private R2.

## Recovery and failure behavior

Before a create request, save its external ID, payload fingerprint and submission intent. Save the returned task ID before polling. Never automatically retry a create request after an ambiguous response. A failed/timed-out project can be resumed with:

```
node --env-file-if-exists=video-worker.env scripts/video-worker.mjs --resume-project=PROJECT_ID
```

This command only claims projects already marked failed; it queries any existing Kling task by ID or external ID and reuses completed shots. A provider-failed task stays failed; rendering another version is an explicit new job. If a previous submission cannot be found, recovery stops rather than spending credits again.

A hard-killed worker may leave a project in generating status. Automatic stale-job leasing is not implemented. An operator must first verify no worker still owns the job and move it to failed without deleting its shot metadata before using the resume command. Never clear saved task IDs or submission intent merely to force a retry.

## Verification commands

```
npm run test:video
npm run video:audit:kling
npm run video:kling:check
npm run video:worker:dry-run
```

`video:audit:kling` uses current database recipes but submits nothing. Dry runs do not claim jobs or update project state.

Official protocol: https://kling.ai/document-api/api/video/3-0-omni/image-to-video
Authentication: https://kling.ai/document-api/guides/get-started/quick-start
