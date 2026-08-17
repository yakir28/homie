# Prompt Two — Find Your Way Home

## Creative direction

An approachable 18-second real-estate film for a modest starter home. The visual promise is not luxury; it is warmth, usefulness, and the feeling that an ordinary family could genuinely live here.

Property-fidelity anchor: `02-front-facade.png`. Keep the compact one-story footprint, gray siding, charcoal roof, sage front door, white garage, ordinary landscaping, warm off-white interiors, oak flooring, and modest furniture consistent. Never upscale or redesign the property.

## Timeline

| Time | Shot | Transition |
|---|---|---|
| 0.0–2.8s | High neighborhood aerial. A subtle warm pulse travels through the streets and settles around the subject home while the drone begins a controlled descent. | Roofline match cut into the verified facade. |
| 2.8–5.0s | Front facade to walkway. Smooth accelerated push that eases down before reaching the porch. | Doorframe foreground wipe. |
| 5.0–9.2s | Enter the living room at human eye level and glide gently toward the kitchen. | Kitchen island passes close to lens as a natural wipe. |
| 9.2–12.2s | Kitchen and dining nook, with one clean lateral reveal. | Clean editorial cut on a music beat. |
| 12.2–14.5s | Short bedroom hero shot with a slow push-in. This is an insert, not a fabricated continuous walkthrough. | Match cut using a bright window edge. |
| 14.5–18.0s | Dining sliding-door edge reveals the backyard patio. End on a calm 1.2-second hold as sunlight becomes slightly warmer. | End frame / logo added only in the editor. |

## Generation prompts

### Shot 1 — Neighborhood hook

Use `01-neighborhood-aerial.png` as the image reference.

Photorealistic real-estate drone footage over an ordinary quiet suburban neighborhood in warm late-afternoon daylight. Begin high and stable, then perform one smooth controlled diagonal descent toward the small one-story subject home near center frame. Add only a restrained warm sunlight pulse moving subtly through the streets and settling around the home, created through natural light and reflections rather than graphics. Preserve every roof, road, tree, house, and property boundary from the reference. Physically plausible drone motion, stable horizon, 24 fps, natural motion blur, realistic exposure, no text, no map pin, no luxury redesign, no new buildings, no warped roofs, no changing geometry, no impossible speed.

### Shot 2 — Facade to porch

Use `02-front-facade.png` as the start reference and `03-front-walkway.png` as the end reference.

Photorealistic real-estate exterior footage of the exact modest one-story gray-sided house in the supplied references. Start with a stable wide facade view, make a brief smooth speed ramp forward, align naturally with the existing walkway, and ease gently toward the sage front door. Keep the exact roofline, garage, windows, siding, plants, driveway, scale, and daylight unchanged. The movement must follow a plausible gimbal path at walking height with clean parallax and natural motion blur. End close enough for the existing doorframe to fill the frame as a practical transition. No architectural changes, no invented landscaping, no vehicles or people appearing, no morphing, no fisheye, no camera collision.

### Shot 3 — Living room to kitchen

Use `04-living-room-entry.png` as the start reference and `05-kitchen.png` as the end reference.

Photorealistic interior gimbal walkthrough of the exact approachable home. Begin just inside the front entry at 1.6-meter camera height with a 24mm full-frame lens, moving slowly through the existing living room toward the visible compact kitchen. Preserve the off-white walls, oak flooring, beige and sage furniture, windows, doorways, proportions, and ordinary lived-in styling. Use one gentle forward move only, with a subtle natural slowdown near the kitchen. Let the existing island edge pass close to camera to create a clean foreground wipe. Real daylight, balanced whites, stable vertical lines, realistic reflections and shadows. No new rooms, no moving furniture, no luxury upgrades, no geometry drift, no floating objects, no excessive depth-of-field.

### Shot 4 — Kitchen to dining

Use `05-kitchen.png` as the start reference and `06-dining-nook.png` as the end reference.

Photorealistic real-estate interior footage. Make one restrained lateral gimbal move from the compact white kitchen to reveal the adjacent simple dining nook with its round oak table and four chairs. Maintain the exact room layout, oak floors, windows, sliding doors, furniture, standard appliances, wall colors, and natural daylight shown in the references. Smooth constant velocity with a gentle ease-out, stable perspective and verticals, natural parallax, no speed warping. No redesign, no new decor, no furniture morphing, no invented opening, no people, no text.

### Shot 5 — Bedroom insert

Use `07-primary-bedroom.png` as the only reference.

Photorealistic short real-estate bedroom insert. Perform a very slow two-second push-in toward the practical queen bed, keeping the exact modest bedroom, bedding, bedside furniture, window placement, off-white walls, and oak flooring unchanged. Natural daylight, stable camera, realistic textures, calm inviting mood, 35mm full-frame lens, no object movement, no new furniture, no luxury staging, no geometry changes, no surreal motion.

### Shot 6 — Backyard resolution

Use `06-dining-nook.png` as the start reference and `08-backyard-patio.png` as the end reference.

Photorealistic real-estate transition from the dining nook to the small backyard patio. Begin facing the existing sliding glass door, move forward on a physically plausible path, and use the real doorframe as a clean foreground wipe into the supplied backyard view. Preserve the exact modest patio furniture, lawn, fence, mature tree, house materials, scale, and ordinary neighborhood setting. End on a stable wide patio composition and hold while the late-afternoon light becomes only slightly warmer. Natural leaves moving gently in a light breeze, realistic glass reflections and exposure adaptation. No pool, no firepit, no added landscaping, no invented structures, no changing furniture, no melting geometry, no fake sunset sky.

## Edit and sound

- Pace: quick opening, comfortable middle, calm payoff.
- Music: warm indie-acoustic beat with restrained electronic percussion, 105–112 BPM.
- Sound accents: soft aerial whoosh, subtle footstep-like percussion at the front-door wipe, quiet room tone inside, birds and leaves in the backyard.
- Color: realistic neutral daylight with mildly warm highlights; avoid orange luxury-grade grading.
- Do not generate titles or logos inside the AI clips. Add typography after the final edit.

## Quality guardrails

- Generate the six shots separately and assemble them in the editor.
- Use only the paired start/end frames stated above; do not ask one generation to invent the entire house tour.
- Favor 4–6 second source clips, then trim and speed-ramp in editing.
- If a transition changes the property geometry, replace it with a hard cut or foreground wipe.
- The aerial is a creative hook; the facade reference is the truth anchor and should appear by 2.8 seconds.
