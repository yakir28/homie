# Video pipeline audit — 23 September 2026

Status: current Higgsfield worker repaired and locally tested. Kling is not implemented or enabled; KLING_API_KEY is still missing. No paid generation was submitted. Worker source changes require deployment/restart on whichever host runs it; no persistent worker was started during this audit.

## Template coverage

The live database has nine active gallery recipes: Reflection Reveal, Pulse Tour, Hidden in Plain Sight, Find Your Way Home, Maple Glass Flight, Warm Threshold, City Apartment, Blueprint to Reality, and The House Behind the Glass. Each has distinct shot prompts or a full-film director prompt. Custom film 15s and 30s build their direction from the user's brief.

The fixtures in tests/fixtures/active-video-templates.json are a public template-data snapshot, not customer data. Run `npm run video:audit` for a read-only check of the current database and `npm run test:video` for regression tests.

## Repairs

- Applied preserve_template_generation_model to the hosted database: queuing retains the template's model instead of forcing Seedance 2.0. Seedance 2.5 4K requests are rejected before credits are deducted.
- Extracted prompt planning and provider-command construction for direct testing. Broken/missing prompts fail instead of silently producing a generic tour. Explicit photo indices are validated rather than silently clamped to another photo.
- Generation uses each shot's authored duration. Assembly proportionally fits every scene into the final duration instead of truncating the end of the concatenated video. This is uniform per-clip retiming, not a new artistic speed-ramp engine.
- Silent templates explicitly send generate_audio=false. Output clips are normalized to consistent dimensions, frame rate, pixel format and audio format; final dimensions and duration are probed before upload.
- Database write errors now propagate. Removed blind retries of paid create commands after ambiguous network failures.
- Dry runs neither claim jobs nor write progress/error events. The existing queued project passed and remained queued at 0%.

## Verification

- All 11 active database recipes pass at minimum and maximum photo counts.
- 25 tests pass, including real FFmpeg assembly of mixed-size/audio clips and pixel verification of the closing scene.
- App production build and git diff whitespace check pass.
- Hosted queue definition checked after migration.
- Supabase advisors returned existing authenticated SECURITY DEFINER RPC warnings and disabled leaked-password protection. This change retains the existing authentication/workspace checks and function grants. See https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Remaining verification

No live model output was generated or visually evaluated. A complete provider-to-R2 run remains unverified. The existing CLI worker still cannot safely resume a paid generation whose create response was lost; immediate task-ID persistence/reconciliation belongs in the Kling adapter before switching providers. The local fixes do not constitute that adapter. No existing queued or completed customer's prompt snapshots were rewritten.
