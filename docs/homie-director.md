# Homie Director

The app navigation is Explore → Director → My videos. Director replaces the Favorites screen; the prompt composer only appears in Director. Existing template hearts remain available on Explore.

## Enable live conversation

Set `OPENAI_API_KEY` as a server-only secret in the app runtime (never a `NEXT_PUBLIC_` variable). Local Vinext development can read it from the server environment; deployed Cloudflare runtime reads the Worker secret. Restart the app after configuring it. Optional `OPENAI_DIRECTOR_MODEL` defaults to `gpt-4.1-mini` and must support the Responses API and structured outputs.

`POST /api/director/chat` verifies the Supabase session, workspace membership, and the workspace listing catalog through RLS before invoking the model. It sends conversation text and property metadata, not photo pixels. The model asks clarifying questions and produces a standalone film direction. It cannot spend credits or queue a video itself.

The separate Generate film button uses the existing priced, idempotent `queue_prompt_video_project` RPC and video-worker pipeline. Rendering requires the existing video worker to be running. Retries reuse the brief's request ID. A completed conversation integration is not a substitute for configuring the AI key or running the renderer.

Recent chats are saved on the current device, scoped to user and workspace (up to 20 chats). They are not synced across devices. A conversation supports up to 19 exchanges; start a new chat after that. Generation settings shown on a brief belong to that brief. The composer contains only the message, photo attachments and send button. Listing selection, duration and aspect ratio are resolved in conversation and saved with each new brief. Enter sends; Shift+Enter adds a line.

## Verification

- `npm run build`
- `node --experimental-strip-types --test tests/director-chat.test.mjs tests/prompt-video.test.mjs`
- Targeted ESLint on DirectorPage, the route and director-chat.
- Browser fixture checks for clarification, brief creation, queued state, history and mobile layout use a mock endpoint, without paid AI or video calls.

## Project workspace layout

Director home keeps the app navigation, with a centered prompt composer and saved project cards beneath it. Opening a conversation switches to a focused workspace: back/project title, scrollable chat and docked composer on the left, independently scrollable video versions on the right. Each generated brief retains its own video-project ID, so another generated direction adds a version without replacing prior films. The preview consumes the app's existing authenticated video list and live generation updates. Mobile uses Conversation / Videos tabs. The back arrow returns to the project home.

## Conversation-driven settings

The model returns a structured `context` alongside each answer: authorized listing ID, 15/30-second duration, and a supported aspect ratio. It receives up to 100 recent workspace listings plus the current property; ambiguous matches require a question. The server rejects IDs outside that catalog and only enables generation for 1–30 saved photos. New uploads become the current photo source. Unsupported output requests require clarification; resolution remains 1080p. No dropdowns are needed in the composer. The brief’s explicit Generate film action still confirms its displayed credit cost.
