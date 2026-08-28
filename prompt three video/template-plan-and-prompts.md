# Daylight Loop — Casual Speed-Ramp Home Tour

## Creative direction

A relatable 23-second vertical real-estate tour of an average early-2000s suburban home. The creative hook is a fast drone descent that cycles from day to night and back to day, followed by the front door opening and an editorial cut inside. The walkthrough remains simple, authentic and spatially coherent.

Property identity anchors:

- Exterior: `03-front-facade-day.png`
- Interior: `04-entry-foyer.png`
- Aerial day/night pair: `01-neighborhood-aerial-day.png` and `02-neighborhood-aerial-night.png`

## Non-negotiable continuity rules

- Generate every interior shot from one reference image only.
- Never interpolate between two different rooms.
- Never ask the model to walk through a doorway into another generated room.
- Speed ramps, day/night timing and room transitions are performed in the editor.
- Keep walls, openings, furniture, windows, cabinet layout and object count locked within every shot.
- Use hard cuts, foreground wipes and motion-matched cuts between rooms.
- If a generated frame changes the property, discard the shot instead of hiding it with a dissolve.

## 23-second timeline

| Time | Image | Action | Edit |
|---|---|---|---|
| 0.0–1.5s | 01 aerial day | Slow drone descent | Ramp from 45% to 240% |
| 1.5–2.7s | 02 aerial night | Same direction, restrained descent | Two-frame white flash into night; ramp 240% to 70% |
| 2.7–4.5s | 01 aerial day | Repeat a later portion of the day shot | Sunrise exposure sweep; ramp 70% to 280% |
| 4.5–7.0s | 03 facade | Human-height push; sage door opens inward | Match cut on roofline, then ramp down before door moves |
| 7.0–9.5s | 04 foyer | Small forward push | Cut when the dark door edge fills frame |
| 9.5–12.0s | 05 living | Short lateral reveal | Ramp only in editor; cut on wall edge |
| 12.0–14.5s | 06 kitchen | Restrained forward push | Island foreground wipe |
| 14.5–17.0s | 07 dining | Small push toward table | Cut on pendant/music beat |
| 17.0–19.5s | 08 bedroom | Calm two-percent push | Clean editorial insert; no fake route upstairs |
| 19.5–23.0s | 09 backyard | Gentle pullback and stable closing hold | Mild ramp into a 1.2-second final hold |

## Generation prompts

### A — Aerial day

Use only `01-neighborhood-aerial-day.png`.

Photorealistic residential drone footage. Animate only the supplied daytime aerial image. Perform one smooth controlled diagonal descent toward the featured gray two-story home while maintaining a stable horizon and subtle physically plausible parallax. Lock every roof, road, sidewalk, tree, fence, driveway, yard and house in its exact position and shape. Natural midday daylight and realistic motion blur. No time-of-day change inside this generation, no morphing roofs, repeated homes, moving buildings, new cars, people, text, logos or map graphics.

### B — Aerial night

Use only `02-neighborhood-aerial-night.png`.

Photorealistic blue-hour residential drone footage. Animate only the supplied night aerial image. Continue one restrained diagonal drone descent in the same direction as the daytime shot, with a stable horizon and subtle physically plausible parallax. Lock the entire neighborhood and featured home exactly. Keep window and street lighting stable with no flicker. No sunrise or daylight transformation inside this generation, no moving buildings, warped roofs, new lights, cars, people, text, logos or map graphics.

### C — Facade and door opening

Use only `03-front-facade-day.png`.

Photorealistic real-estate arrival at the exact modest gray two-story home. Make one restrained human-height push along the existing walkway. During the final second, animate only the existing muted-sage front door rotating naturally inward on its real hinges by approximately sixty degrees. Lock the roofline, siding, porch, garage, windows, railings, shrubs, tree, lawn, driveway and all shadows. Do not reveal or invent a detailed interior beyond a naturally dark threshold. End with the real door edge and dark doorway filling most of the frame for an editorial cut. No morphing facade, moving windows, changing plants, people, vehicles, text or luxury redesign.

### D — Foyer

Use only `04-entry-foyer.png`.

Photorealistic gimbal shot inside the exact entry foyer. Perform one slow four-percent forward camera push at human eye level. Lock the open sage door, console, mirror, hooks, basket, rug, staircase, balusters, handrail, ceiling light, walls, openings and distant living room in their exact original positions for the entire shot. Keep the same foyer from first frame to last. No transition into the living room, no furniture movement, no geometry drift, no invented doorway, no people or text.

### E — Living room

Use only `05-living-room.png`.

Photorealistic casual-home real-estate shot. Perform one restrained three-percent lateral slide across the exact living room. Lock the sectional, sage chair, coffee table, rug, lamp, artwork, ceiling fan, kitchen opening, foyer sightline, walls, windows and floorboards. Natural daylight, stable verticals and subtle parallax only. No movement into the kitchen, no furniture changes, no new opening, no morphing, people or text.

### F — Kitchen

Use only `06-kitchen.png`.

Photorealistic kitchen listing shot. Perform one subtle four-percent push toward the small wood island. Preserve every white cabinet, appliance, counter, backsplash tile, pendant, stool, fruit bowl, doorway, visible living room and floorboard exactly. The kitchen must remain unchanged for the entire shot. No cabinet movement, appliance warping, room transition, new decor, people, text or luxury upgrade.

### G — Dining room

Use only `07-dining-room.png`.

Photorealistic casual dining-room shot. Perform one slow three-percent push toward the round table and flowers. Lock the table, four chairs, sideboard, pendant, kitchen opening, sliding glass door, exterior view, walls and flooring. Maintain the exact chair count and object positions. No pass through the sliding door, no changing exterior, morphing furniture, people or text.

### H — Bedroom

Use only `08-primary-bedroom.png`.

Photorealistic modest-bedroom insert. Perform one very slow two-percent push toward the queen bed. Lock the bed frame, bedding, pillows, lamps, bedside tables, dresser, carpet, door, window, blinds, ceiling fixture and artwork. Calm natural daylight and stable geometry. No new room reveal, moving bedding, furniture changes, people, text or luxury staging.

### I — Backyard finale

Use only `09-backyard-patio.png`.

Photorealistic backyard real-estate finale. Perform one gentle three-percent pullback and finish on a stable composed hold. Preserve the exact gray rear facade, windows, sliding door, patio, four chairs, table, grill, lawn, tree, fence and shrubs. Animate only subtle existing foliage in a light breeze. No pool, firepit, pergola, new landscaping, moving furniture, geometry drift, people or text.

## Editing and sound

- Music: upbeat indie-electronic track, 112–118 BPM, warm rather than luxury-oriented.
- Hook sound: rising drone whoosh, short low-frequency dip at night, reverse whoosh back to day.
- Door: one realistic latch click and soft hinge sound; no cinematic explosion.
- Interior cuts: soft percussion hits and restrained room tone.
- Speed ramps happen after generation, using optical-flow only when it does not bend architecture.
- No cross-dissolves between different rooms.
- Add any title or logo only after the video has been assembled.
