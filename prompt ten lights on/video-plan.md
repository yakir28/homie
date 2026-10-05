# Lights On — Template Plan

Reference: "Brand new luxury duplex in Rockdale, Sydney" (16:9, 20.7 s, 29.97 fps, music ~92 BPM → one beat every 0.65 s). Contact sheets in `reference/`.

## 1. What the reference does

| Time | Shot | Technique |
|---|---|---|
| 0.0–1.0 | Wall sconce on textured stone, starts dark and switches on | **Detail-first hook** + lights-on; a faint 3×3 grid already sits over the frame |
| 1.0–1.6 | Sconce → dusk facade, tile by tile | **3×3 grid tile reveal** (the signature transition) |
| 1.6–2.5 | Facade at blue hour, mailbox with house number in the foreground | Slow lateral slide, foreground parallax |
| 2.5–3.9 | Curved battens facade (low angle) → garden-path uplights (macro) → sky through a triangular cut-out with LED strip | One architectural detail per beat, low angles |
| 4.4–5.2 | White flash → dark interior → lights come on | **Flash cut + lights-on reveal** (exterior to interior) |
| 5.2–7.7 | Kitchen detail → wide kitchen, cove lights on → past-the-object fireplace → kitchenette | Pushes and **foreground occlusion wipes** (camera slides past a vase/column to cut) |
| 7.7–9.6 | Agent walks, car, back to facade | People + car (drop for Homie) |
| 9.6–10.4 | Pixel/glitch hit → top-down drone spin over the night courtyard → drone rises | Top-down rotate |
| 10.4–18.1 | Living → pendant → bed 1 → robe → bed 2 → bath → pool tiles → garage → dining | **One cut per beat (0.65 s)**, alternating wide room / macro detail |
| 18.1–20.7 | Low angle up at curved balcony + LED strip against the sky | Slow end hold on architecture |

Why it works: the house is shown as **light and details**, not a room list. Exterior at blue hour (cool teal sky) against warm 2700 K interior light; cuts sit exactly on the beat; the first second is a mystery detail, so the viewer waits for the reveal.

## 2. The Homie template

**Name:** Lights On · **Category:** Cinematic · **Format:** 9:16 only · **Duration:** 20 s · **Photos:** 8–10.

**Promise to the agent:** "Your home at blue hour, lights switching on room by room."

### Story beats (20 s, beat grid 0.65 s at ~92 BPM)

| Time | Beat | Source photo | Generated motion |
|---|---|---|---|
| 0.0–1.3 | Hook: detail of a real light fixture or texture on the facade, lights switch on | Facade (close crop of an existing fixture) | Static macro, practical light turns on |
| 1.3–1.9 | **Grid reveal** into the facade | Facade | Done in edit (see 4) |
| 1.9–4.5 | Facade at blue hour, then 2 exterior details (entry, path, roofline) | Facade + entry/garden | Slow slide; low-angle tilt up |
| 4.5–6.5 | Flash cut → interior dark → lights on | Living or kitchen | Push in while existing lights turn on |
| 6.5–15.0 | Interior run, one cut per 1–2 beats, wide/detail alternating | Kitchen, dining, living, bedroom, bathroom | 3 % pushes, slides past real foreground objects |
| 15.0–17.0 | Outdoor space at dusk (patio, pool, yard) | Backyard | Slow slide or top-down if an aerial is supplied |
| 17.0–20.0 | End hold: facade or roofline at blue hour, all lights on | Facade | Gentle low-angle push, clean space for the end card |

### What Homie does NOT copy

- **People** (agent walking) and **the car**: never add them; they aren't in the listing photos.
- **The glitch hit**: off-brand. Replace with a hard beat cut.
- **Invented fixtures**: the lights-on effect may only use lamps, sconces, cove lights and pendants that appear in the photos. A room with no visible fixture gets a warm "evening exposure" lift instead.

## 3. Generation (Higgsfield reference mode, current pipeline)

`creative_recipe` for `lib/video-prompts/template-directions.mjs`:

- **mood:** Blue hour arrival: the home reveals itself through light and architectural details, then warm interiors switch on room by room.
- **opening:** Start on a close detail of an existing light fixture or textured surface visible in the FIRST reference; the fixture switches on. Then establish the full facade at blue hour. Never add a fixture, house number or object that isn't photographed.
- **treatment:** Exterior relit to blue hour (deep teal sky, cool ambient); interiors warm 2700 K from existing practical lights. Relighting is intentional; materials, colors and geometry stay the same.
- **motion:** Low-angle tilts and slow lateral slides outside; inside, 3 % pushes and slides that pass a real foreground object to hide the cut. Short, rhythmic holds; one detail close-up for each wide view.

Chapters: 20 s at a 15 s per-request limit → 2 chapters (10 s + 10 s): chapter 1 = facade, exterior details, first interior; chapter 2 = remaining rooms, outdoor space, end facade. Photo order: `front_facade, entry, garden_or_path, living_room, kitchen, dining_room, bedroom, bathroom, backyard` (+ optional aerial).

## 4. Edit layer (the parts the model can't do reliably)

The current `lib/video-assembly.mjs` only hard-cuts chapters. The reference's identity lives in the edit, so add an optional template "finish" step:

1. **Grid reveal:** 3×3 tiles flip from the opening detail frame to the facade frame, 60 ms stagger, in 0.6 s (ffmpeg overlay of 9 crops, or the HTML frame renderer we already use for Reels).
2. **Beat-locked cuts:** speed-ramp each chapter so cuts land on the 0.65 s grid of the template's music track.
3. **Flash cut:** 3-frame white bloom at the exterior → interior cut.
4. **Grade:** light teal/orange LUT, fine grain, slight vignette.
5. **Music:** a licensed ~92 BPM minimal electronic/house track (no copying the reference audio).

## 5. Steps

1. **Demo property** — generate 9 photos of one modern home with GPT Image (facade with visible wall lights, entry, path lights, kitchen with pendants/cove lighting, living, bedroom, bathroom, patio/pool). ~25 credits.
2. **Test the opening** — one 10 s Seedance draft (480p) of chapter 1 to check the lights-on effect and blue-hour relight. 45 credits.
3. **Generate both chapters in 1080p** after approval. ~2 × 192 credits.
4. **Edit the preview** — grid reveal, beat cuts, flash, grade, music → `preview.mp4` + `thumbnail.jpg`.
5. **Code** — add `lights-on` to `template-directions.mjs` (+ `kling-shot-plan.mjs` direction), the edit layer as an opt-in step in `video-assembly.mjs`, and `scripts/publish-lights-on-template.mjs` (copy of the GTA Drop publisher).
6. **Test** on 2 real listings from the app (with and without visible light fixtures), then publish to R2 + Supabase and the homepage gallery.

## Decisions

- Format: 9:16 only (decided 2026-10-05).

## Open questions

- Allow the drone top-down shot when the agent supplies an aerial?
- Music: which licensed track (or generate one with Higgsfield audio)?

## Demo property photos (step 1, Higgsfield gpt_image_2_5, 9:16, generated 2026-10-05)

Inputs are daylight on purpose: real agents upload daytime photos, and the template's job is to turn them into blue hour with the lights on. The blue-hour facade is only the identity reference for the other exterior shots.

| # | View | Job ID |
|---|---|---|
| 0 | Facade, blue hour (identity reference only) | a6a39fb2-5c8e-4b93-a46c-9718315f246e |
| 1 | Facade, daylight | fca439df-a818-4bc8-ad4e-3c21d05da7e0 |
| 2 | Entry with oval wall sconces | b2f0031b-1118-4894-8134-3bcb2682afce |
| 3 | Garden path with uplights | 664f364e-773c-432b-8805-d02ae4f6d0e6 |
| 4 | Kitchen with pendants and cove light | 0dbef557-adb5-44a5-a4d5-c0bb17f92df5 |
| 5 | Living room with fireplace and sconce | 48672abb-1e1c-49c9-8009-d6306bb6ebe7 |
| 6 | Dining with drum pendant | 3c069e17-366a-4d99-9a4f-63716d8571bb |
| 7 | Primary bedroom with wall lights | ed81e697-c63c-4cf1-a311-7eb9175b3642 |
| 8 | Bathroom with LED niche | f3e9f9ce-7d41-4a46-ad74-ccdc53d90b66 |
| 9 | Backyard pool | 68f69646-c3b0-42f7-bf40-0f928ef21e5c |

## Video chapters (Seedance 2.5 omni_reference, 1080p, 9:16, high bitrate, no audio, 120 credits each)

Skipped the 480p draft by decision on 2026-10-05.

| Chapter | Refs (in order) | Job ID |
|---|---|---|
| 1 (0–10 s): sconce on → facade → battens → path → living → kitchen | 1, 2, 3, 5, 4 | 818ed326-709e-4542-bed3-1bd28397f784 |
| 2 (10–20 s): dining → pendant → bedroom → bath → pool tiles → backyard → facade end | 6, 7, 8, 9, 1 | 0a412542-c3f0-4827-bc72-9920400f2557 |
