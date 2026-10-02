# Omni integration execution plan

1. Verify active templates route to Higgsfield O3 reference mode and retain distinct creative recipes.
2. Harden accepted-request persistence, trusted polling, error diagnostics and recovery. Never resubmit an ambiguous missing-ID request.
3. Validate all templates at minimum/maximum reference counts, resolutions and exact total runtime; verify the official input schema.
4. Run one previously rejected template project through the real provider, assembly and storage pipeline. Project 39 was rejected with HTTP 400; project 41 is ambiguous and remains untouched pending its provider request ID.
5. Verify final duration, dimensions and stored playback media. Report actual provider failures or operational blockers without claiming readiness.

Scope: Omni reference via Higgsfield, existing template and Director generation routes. No pricing changes or automatic provider substitutions.

Execution evidence:
- All 11 active database templates already route to O3 reference mode and pass read-only planning audit.
- Build passed; 93 automated tests passed after adding safe retry for transient GET polling network failures.
- Project 39 was resumed after preserving the original rejected HTTP-400 submission metadata. First actual Omni request was accepted, saved, polled successfully and returned a playable 9-second 720p clip (the project selected 720p).
- Uploaded JPEG was downloaded again and compared byte-for-byte: identical.
- Visual inspection confirms property references are used, but the model changes their requested order/opening; generation completion alone is not a visual-fidelity guarantee. Manual review remains necessary.
- Browser smoke check loads Homie; the available browser is not signed into the user's app, so authenticated UI playback requires separate verification.

Completed live verification:
- Project 39 (`Reflection Reveal — 210 S Bundy Dr`) completed both 9-second Omni chapters and FFmpeg duration/resolution verification.
- Final 18-second video stored in R2 at `videos/78/39/version-1.mp4`; database version is ready and project is awaiting_approval at 100%.
- Actual Homie media route returned HEAD 200 video/mp4 and range GET 206 with 1024 bytes and total size 9,295,850 bytes. Playback transport is verified.
- This is a real 720p test matching the existing project's selected resolution; 1080p/4k configuration is covered by automated tests, not paid outputs.
- Director conversation still requires OPENAI_API_KEY (absent from local env files checked). Its generation recipes route to Omni, but chat availability is not established.
