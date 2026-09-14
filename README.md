# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Video generation worker

The browser queues projects in Supabase; a separate Node worker generates short
Higgsfield Seedance 2.0 Mini clips and assembles the final MP4. It runs outside the
Cloudflare web runtime because generation can take several minutes and the final
assembly uses FFmpeg.

1. Apply the Supabase migrations and copy `video-worker.env.example` values
   into your worker environment.
2. Install the Higgsfield CLI, run `higgsfield auth login`, select the billing
   workspace, and verify it with `higgsfield account status`. Install `ffmpeg`
   and authenticate with `wrangler login` when R2 API credentials are not supplied.
3. Validate the next queued project without spending generation credits:
   `npm run video:worker:dry-run`.
4. Process one project with `npm run video:worker:once`, or keep polling with
   `npm run video:worker`.

The worker automatically reads an ignored `video-worker.env` file when present.
Higgsfield credentials and Supabase's secret key belong only
in the worker environment. Never expose them through `NEXT_PUBLIC_*` variables.
Use `SUPABASE_SECRET_KEY` for current
Supabase projects; the worker also accepts the legacy
`SUPABASE_SERVICE_ROLE_KEY` name.

## Explore prompt films

Explore's prompt composer creates one 15- or 30-second film from all of a listing's
photos in their saved order (1–30 photos), with a selected aspect ratio and 1080p
output. `lib/real-estate-video-prompt.mjs` implements version 1 of the Real Estate
AI Video skill as a structured director's brief, using Seedance 2.5 in
`omni_reference` mode. The original user prompt and recipe version are saved with
the project; the compiled director's brief is recorded with the generated shot.

Apply `supabase/migrations/20260913161859_add_prompt_video_composer.sql` before
using the composer. Its internal recipes inherit the existing Seedance 2.5
per-second tariff and resolution multipliers. The server verifies the quoted
cost, workspace and listing access, and charges retries only once.

Run the regular worker above to process every queued project, or
`npm run video:worker -- --prompt-only` to process only prompt-created films.
The worker must remain running for queued videos to progress. Verify the prompt
compiler with `node --test tests/prompt-video.test.mjs`. The integration checks in
`tests/prompt-video-db.sql` require a funded paid workspace with listing photos
and roll back all their test jobs and credit debits.

## Cloudflare R2 media storage

Homie stores generated videos and template media in the private `homie`
R2 bucket. Supabase remains the metadata, authorization, and generation-queue
database. Template assets use the `templates/` prefix with long-lived public
caching. Generated videos use the private `videos/` prefix and are streamed
through one-hour signed playback links with byte-range support.

1. Enable R2 for the Cloudflare account and create the `homie` bucket.
2. For a hosted worker, create an R2 API token scoped to Object Read & Write for that bucket. During local development, an authenticated Wrangler session is used as a fallback and the result is also copied to local R2 for localhost playback.
3. Configure the server-only values from `.env.example` and
   `video-worker.env.example`.
4. Run `npm run r2:sync-templates` once to copy active catalog assets to R2.
5. Run `npm run video:worker`; completed videos upload directly to R2.

### Production media delivery

Attach a custom domain such as `media.example.com` to the R2 bucket and set
`NEXT_PUBLIC_MEDIA_ORIGIN` to that origin. Create a Cloudflare Cache Rule for
`/templates/*` with Cache Everything and a one-year edge TTL, then enable Smart
Tiered Cache. Keep object keys versioned because these responses are immutable.

Enable Cloudflare Images transformations for the website zone and set
`NEXT_PUBLIC_IMAGE_TRANSFORMATIONS=1`. The dashboard will then request responsive
AVIF/WebP variants instead of using full-size listing images in every card.

The `r2.dev` hostname is suitable for development only; production media should
use the custom domain. Private generated videos continue to use authenticated,
byte-range R2 playback. For adaptive-bitrate delivery, import each completed R2
master into Cloudflare Stream and store its signed playback URL in
`video_versions.video_url`.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
