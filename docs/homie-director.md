# Homie Director

The app navigation is Explore → Homie Director → My videos. Director replaces the Favorites screen; the prompt composer only appears in Director. Existing template hearts remain available on Explore.

## Enable live conversation

Set `OPENAI_API_KEY` as a server-only secret in the app runtime (never a `NEXT_PUBLIC_` variable). Local Vinext development can read it from the server environment; deployed Cloudflare runtime reads the Worker secret. Restart the app after configuring it. Optional `OPENAI_DIRECTOR_MODEL` defaults to `gpt-4.1-mini` and must support the Responses API and structured outputs.

`POST /api/director/chat` verifies the Supabase session, workspace membership, and selected listing through RLS before invoking the model. It sends conversation text and property metadata, not photo pixels. The model asks clarifying questions and produces a standalone film direction. It cannot spend credits or queue a video itself.

The separate Generate film button uses the existing priced, idempotent `queue_prompt_video_project` RPC and video-worker pipeline. Rendering requires the existing video worker to be running. Retries reuse the brief's request ID. A completed conversation integration is not a substitute for configuring the AI key or running the renderer.

Recent chats are saved on the current device, scoped to user and workspace (up to 20 chats). They are not synced across devices. A conversation supports up to 19 exchanges; start a new chat after that. Generation settings shown on a brief belong to that brief; changing the composer settings applies to the next message.

## Verification

- `npm run build`
- `node --experimental-strip-types --test tests/director-chat.test.mjs tests/prompt-video.test.mjs`
- Targeted ESLint on DirectorPage, the route and director-chat.
- Browser fixture checks for clarification, brief creation, queued state, history and mobile layout use a mock endpoint, without paid AI or video calls.
