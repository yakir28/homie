---
name: homie-reel
description: Turn Homie template footage (a generated home-tour video or its raw clips) plus the listing photos into a polished 9:16 Instagram/TikTok Reel with kinetic typography, branded labels, an end card, sound and a caption. Adapted from latent-spaces/brag (brag-slim) for real-estate listing Reels. Use when someone says "/homie-reel", "make a reel from this template", "improve the reel visuals", or asks for a social video that shows listing photos becoming a tour.
---

# /homie-reel

Listing photos in, a home tour that moves out. The footage is the hero; the graphics make it read like a premium brand ad, not a slideshow with captions.

Adapted from [`/brag`](https://github.com/latent-spaces/brag) (MIT): same creative laws (hook first, show the thing, readable, every frame postable, grounded claims), rebuilt for vertical real-estate Reels and Homie's brand.

Usage: `/homie-reel <template video or clips folder> [listing photos folder] [message]`.

| Option | Default |
|---|---|
| Format | 1080×1920, 30fps, H.264 + AAC |
| Duration | 18–22s (hard limits 15–25s) |
| Tone | `polished` (see tones below) |

Write deliverables to `social/instagram/<reel-name>/` — `reel.mp4`, `poster.jpg`, `caption.txt`, `plan.md` — and keep frames/stems in `work/` (gitignored). Commit the final `.mp4` with `git add -f` (the repo ignores `*.mp4`).

## 1. Inspect

- **Footage:** prefer a template's raw clips (`prompt */video/clips/`, `*/handles/`) over its final cut, so no old baked-in text fights the new typography. Run scene detection (`ffmpeg -vf "select='gt(scene,0.25)',showinfo"`) on finals to find cut points. Make contact sheets and look at them.
- **Photos:** the template's source listing photos (`prompt */images/`) are the "before" — they power the hook.
- **Audio:** use the template's own soundtrack or the clip's audio. Do **not** use unlicensed music. Kenney SFX (CC0) from the brag repo are fine.
- **Rights check:** skip sources that look like real listings (MLS watermarks such as "CRMLS", website screenshots). Homie-generated sample properties are fine but never present them as a real client's listing.
- Answer before planning: what is the one transformation to show? What is the hook? What is the single message? Which footage moments are strongest?

## 2. Plan

Write `plan.md`: hook, message beats, storyboard with exact in/out times summing to the target, transitions, SFX cues.

**Shape:** Hook — the "before" (listing photos, 2–3s) → Reveal — photos become the tour (match cut) → 2–3 message beats over the tour → End card (2.5s).

## 3. Typography and graphics system (the part that makes or breaks it)

App URL: **try-homie.com** (not homie-app.com). Instagram: @homie.app.ai.

Brand tokens: Urbanist (load locally from `social/instagram/week-01/src/urbanist-local.css`); charcoal `#20231e`; cream `#f9f2e2`; sage `#9cac90`; deep sage `#71845f`. The official wordmark (`public/brand/official/homie-wordmark-dark-on-cream.png`, background `rgb(249,241,226)`) is the only logo — never retype it in a font and never place a logo PNG on a background that doesn't match its own.

**Type scale (1080 wide):**
- Hook / message lines: Urbanist 800, 116–140px, line-height 0.95, letter-spacing −0.03em, 1–3 words per line, max 3 lines, max ~7 words on screen.
- Labels: Urbanist 700, 34–40px, sentence case.
- Never all-caps for message lines; never mixed fonts.

**Motion (every text entrance is kinetic, never a plain fade):**
- Words rise from behind a mask: each word in an `overflow:hidden` wrapper, inner span `translateY(105%) → 0`, 0.5s `cubic-bezier(.16,1,.3,1)`, 70ms stagger.
- Emphasis is a **marker swipe**, not a color swap: after the words land, a sage block scales in behind the key word (`scaleX 0→1`, origin left, 0.35s) and the word turns charcoal.
- Exit as a unit: the whole block moves up 40px and fades in 0.25s. Never pull text before it's readable (~0.3s per word, counted from fully settled).
- One text block on screen at a time. Stacked lines ("No shoot. / No editing. / No prompts.") arrive one per beat and hold together.

**Legibility without cheap bands:** no full-width dark gradient bars. Use a soft local scrim — a large blurred radial dark ellipse behind the text block only — plus a subtle `text-shadow: 0 4px 30px rgba(0,0,0,.35)`.

**Safe zones (Instagram UI):** keep text out of the top 230px, bottom 420px and side 70px.

**Room labels:** lower-left chip on translucent charcoal `rgba(20,22,19,.55)`, a sage index square ("01") + room name in cream; slides in from the left behind a mask 0.3s after the shot starts, exits 0.2s before the cut.

**Photo cards (hook):** real listing photos as cards with a 14px white border, 28–32px radius, deep shadow, slight rotation; they land one per beat with a soft SFX; the hero card then scales to full frame and match-cuts into the first clip's first frame (use that frame as the card image).

**End card:** cream background matching the wordmark exactly, wordmark large, "Your listing photos. / A tour that moves." in charcoal with the marker swipe on "moves", sage CTA pill "Try free · link in bio", handle `@homie.app.ai`. It enters by pushing up over the last shot — not a crossfade.

**Transitions between shots:** directional pushes (`xfade=smoothleft` / `smoothup`, 0.35s) or hard cuts on motion. Never a slow crossfade between two busy shots (muddy double exposure).

## 4. Build

- Footage track: ffmpeg — trim clips, scale to 1080×1920 (`lanczos`), `fps=30`, `settb=AVTB` on every branch before `xfade`/`concat`.
- Graphics track: one HTML timeline per reel where **every frame is a pure function of time** (CSS animations with absolute delays, paused and seeked). Render with `scripts/render-frames.mjs` to a transparent PNG sequence (opaque where the graphics own the frame — hook and end card) and overlay it on the footage.
- Audio: soundtrack + SFX mixed as one piece — SFX 12–16 dB under the music, warm low-HF-risk files (`impactSoft_*`, `interface/bong_001`, `ui/click2`), fade the music out under the end card.

## 5. Check, render, deliver

- Before the final render, pull stills from **every** text beat and from mid-transition; fix overflow, collisions, low contrast and safe-zone violations.
- Poster: the strongest settled frame → `poster.jpg`; also bake it as frame 0 so the platform thumbnail shows it.
- `caption.txt`: short, no emojis unless asked, specific, one CTA, 3 hashtags max.
- Claims must be grounded in Homie's own copy (see `HOMIE_EXPLAINER_BRIEF.md`): no generation-time promises, prices, customer counts, or implied platform partnerships. Mark posts as AI-generated content when publishing.

## Tones

| Tone | Feel |
|---|---|
| `polished` (default) | Calm confidence, long holds, marker emphasis, pushes |
| `punchy` | Faster beats, hard cuts on motion, more SFX |
| `cinematic` | Bigger type, slower pushes, fewer words |
