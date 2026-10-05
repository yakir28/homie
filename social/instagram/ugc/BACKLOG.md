# UGC backlog — make when Higgsfield credits are available

Reference Reels to recreate as Homie UGC videos. When credits are topped up, start here.

## 1. "Comment INVITE" split-screen demo (saved 2026-10-05)

- Source: https://www.instagram.com/reel/DY-q8AvSZxB/ — a competitor (Rendy, rendy.io) ad
- Local copy: `reference/ref-01-rendy-comment-invite.mp4`, frames: `reference/ref-01-contact-sheet.jpg`
- Status: analyzed, waiting for Higgsfield credits

### What the reference does (13.3s, 9:16)

**Format:** split screen. Top half = product proof (before/after, screen recording); bottom half = a founder-style talking head at a desk with a laptop, lav mic in hand, warm lamp light, casual black tee. Single-word captions in a small dark pill sit on the seam between the halves, one word at a time, synced to speech.

| Time | Top half | Bottom half / text | Spoken (from captions) |
|---|---|---|---|
| 0.0–2.8 | Before/After cards on light grey: small "Before" listing photo, big "After" vertical video playing, cycling through several properties | Talking head | "...real estate media — these are videos..." |
| 2.8–3.5 | Cut-in: a camera gimbal on a red background | — | "...without a gimbal" |
| 3.5–5.3 | Full-frame talking head, finger raised | Big kinetic text: "only / one / click" | "they're made with only one click" |
| 5.3–7.3 | Browser: typing the product URL, then the site | Talking head pointing up | "go to this URL" |
| 7.3–8.6 | App: listing photos grid → cursor clicks "Render My Listing" | Talking head looking at laptop | "list... photos... render my listing" |
| 8.6–10.0 | Grid of generated vertical videos | Talking head | "get professional videos" |
| 10.0–11.0 | Blurred background, one vertical video card centered | Talking head | "that are actually good" |
| 11.0–13.3 | Card + big text "comment "INVITE"" | Talking head, arm raised | "comment INVITE to use it for free" |

**Why it works:**
1. The proof is on screen in second 0: before/after with the result already playing. No intro.
2. One enemy: the gear (a gimbal). "Without a gimbal" makes the value concrete in one image.
3. The demo is real UI: URL → listing → one button → results. Fast enough to believe.
4. "Only one click" is the only big text. Everything else is small word-by-word captions.
5. The CTA is comment-to-get ("comment INVITE"), which drives comments (reach) and leads via an auto-DM.

### Homie version (plan)

- **Length / format:** 13–15s, 9:16, same split screen.
- **Presenter:** an AI presenter via Higgsfield (Marketing Studio / UGC talking head) at a desk with a laptop — or cheaper and more authentic: a team member films the bottom half on a phone (zero credits) and we composite everything else ourselves with the `homie-reel` skill.
- **Top half assets we already have:** before/after = listing photo → Homie tour (`prompt six stop the scroll/images` + `reels-v3/reel-1`); gear cut-in = a Higgsfield image of a gimbal/drone on a sage background; the product flow = a screen recording of the Homie app (Explore → choose template → Generate → Approve; run the app locally and record with Playwright); the results grid = the template previews in `public/template-previews/`.
- **Script draft (~35 words):**
  "These are real estate videos — made without a camera crew. / Made from the listing photos you already have. / Go to homie-app.com, / bring in your listing, / pick a style, / and get a home tour you'd actually post. / Comment HOMIE and I'll send you the link."
- **Big text moment:** "no / camera / crew" (sage marker on "crew"), in Homie typography.
- **CTA:** "Comment HOMIE". This needs a comment-to-DM automation (ManyChat or Meta's built-in auto-reply) set up first, otherwise use "link in bio".
- **Claims check:** no "one click" or time promises unless the product really does that; don't show a competitor's name; mark as AI-generated if the presenter is AI.
- **Cost:** preflight with `get_cost: true` before generating.
