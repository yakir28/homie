# Homie — Instagram plan (@homie.app.ai)

## Where the account stands (Oct 4, 2026)

- 3 posts, 4 followers, 59 views in the last 30 days.
- **The Reel got 256 views. The two carousels got 18 and 35.** Reels reach roughly 7–14x more people, and almost all of that comes from non-followers. With 4 followers, every carousel only reaches people who already follow you. A Reel is the only format that gets shown to strangers.
- Conclusion: **Reels first.** Carousels are there for saves and shares, and to give a profile visitor a reason to follow.

## Audience

| Segment | Who | What they want to hear |
|---|---|---|
| **Primary** | Independent US real estate agents who post listings on Instagram and TikTok and have no video editor | "Turn my listing into a video without a shoot, without editing, without learning AI" |
| Secondary | Brokerage teams and marketing managers | A consistent look across every agent, control and approval |
| Amplifiers | Real estate marketers, photographers, home stagers | Visual content worth sharing |

**Their pain points (from `Homie Brain/01 Product/Customer and Problem.md`):** shoots and editing are expensive and slow, AI tools need prompts and trial and error, and they're afraid AI will invent things that aren't in the property.

## Content pillars

1. **Before → After (40%)**: photos → tour. This is the product's hero, and it's always a Reel.
2. **Education for agents (25%)**: listing-marketing tips. These are carousels built to be saved.
3. **How it works (20%)**: import → template → generate → approve. Shows how simple it is and how much control the agent keeps.
4. **Template showcase (15%)**: one style at a time (Stop the Scroll, Reflection Reveal, Golden Hour…).

## Rhythm

- 4 posts a week: 2–3 Reels and 1–2 carousels.
- Posting time (a starting hypothesis to test): Tue–Thu, **12:00–13:00 ET = 19:00–20:00 Israel time**.
- Every Reel gets a hook in the first second, on-screen text (most people watch with the sound off), and a closing card with a CTA.

## Messaging rules (from `HOMIE_EXPLAINER_BRIEF.md`)

- Don't promise generation time, prices, customer numbers or sales results.
- Don't imply an official partnership with Zillow or any other platform.
- Don't claim automatic publishing. The agent always approves.
- ⚠️ The current bio says "In seconds". That's a speed promise the brief tells us to avoid. Suggestion: `Turn listing photos into cinematic home tours. No prompts needed 🏠`
- ⚠️ The demo properties in the posts are sample properties created for the demo. Don't present them as a real client or a real listing.

---

## Week 1 — ready to upload (`week-01/build/`)

### Post 1 · Reel · Tuesday — `reel-1-photos-to-tour.mp4` (25s)
Opens on 3 still photos ("These are just listing photos."), then they become a tour, then a closing card.

**Caption:**
```
These were just listing photos. 📸 → 🎬

Homie turns the photos you already have into a cinematic home tour. No shoot. No editing. No prompts.

Pick a style, generate, review, approve. You stay in control of every video.

Try it free, link in bio 🏠

#realestatemarketing #realtorlife #listingvideo #realestateagent #realtor #homeforsale #realestatetips #propertymarketing #reelsforrealtors #justlisted
```

### Post 2 · Carousel · Wednesday — `how-it-works/01–06.png`
**Caption:**
```
From listing photos to a home tour, in 4 steps 👇

01 Import your listing
02 Pick a style (not a prompt)
03 Generate the tour
04 Review, approve, share

No camera crew. No editing software. Nothing goes out until you approve it.

Save this and try it on your next listing, link in bio.

#realestatemarketing #realtortips #listingvideo #realestateagent #proptech #realtor #aiforrealestate
```

### Post 3 · Reel · Thursday — `reel-2-no-camera-crew.mp4` (20s)
**Caption:**
```
No camera crew. No editor. No prompts.
Just the listing photos you already have. 🏡

This walkthrough was built from still photos with Homie.

Want one for your listing? Link in bio.

#realestatevideo #realtorlife #listingvideo #hometour #realestatemarketing #realtor #justlisted
```

### Post 4 · Carousel · Saturday — `3-mistakes/01–06.png`
**Caption:**
```
3 mistakes that make buyers scroll right past your listing 👀

1. The photo dump
2. Leading with your weakest shot
3. No story, just rooms in random order

Fix all three by turning your photos into a tour that flows: outside → entry → living → kitchen → backyard.

Save this for your next listing 📌 and follow @homie.app.ai for more.

#realestatetips #realtortips #realestatemarketing #listingphotos #realestateagent #realtor #instagramforrealtors
```

**Upload tips:**
- Reels: pick the first frame as the cover (the hook headline). Turn on "Also share to feed".
- Carousels: 4:5 aspect ratio (1080×1350). Upload them in numbered order.
- Reply to every comment within the first hour.

---

## Ideas for weeks 2–4

| # | Format | Idea |
|---|---|---|
| 5 | Reel | "Same house, 3 styles": the same photos in Stop the Scroll / Reflection Reveal / Golden Hour |
| 6 | Carousel | "The perfect shot order for a listing video": a shot list agents can save |
| 7 | Reel | Screen recording of the product: from the listing screen to an approved video |
| 8 | Reel | "POV: you just got a new listing and have no time for a shoot" |
| 9 | Carousel | "Photos vs video: what a buyer actually sees" (no invented stats) |
| 10 | Reel | Blueprint to Reality: from a plan to a home |
| 11 | Story | Weekly poll: "Which style for this house?" |
| 12 | Reel | Golden Hour Estate: a premium property at sunset |

## Rebuilding

```bash
cd social/instagram/week-01/src
NODE_PATH=/opt/node-tools/node_modules node render.mjs   # carousels + overlays
./build-reels.sh                                          # Reels
```
