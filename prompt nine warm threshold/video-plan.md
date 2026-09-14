# Warm Threshold — Instagram Template Plan

## Delivery

- Format: 4:3 landscape feed video
- Master: 1440×1080, 30 fps, H.264 high bitrate
- Optional 2K master: 2048×1536, 30 fps
- Duration: 18 seconds
- Look: believable, warm, polished real-estate photography; average suburban home, never mansion-like
- Motion principle: high pace comes from camera travel and editorial speed ramps, not rapid scene cutting

## Required pre-production

The current reference images are 9:16. Before video generation, create dedicated 4:3 reference frames for every selected shot by extending the real scene sideways, rather than center-cropping the portrait originals. Lock the house identity and preserve the main subject near the center-safe area so Instagram cropping and UI overlays do not hide important details.

## Revised timeline

| Time | Source | Generated camera motion | Edit treatment |
|---|---|---|---|
| 0.0–12.0s | `09-neighborhood-aerial.png` + `01-front-exterior.png` + `02-entry-foyer.png` | One continuous hero generation: drone descent → curved facade approach → door opens → camera enters the verified foyer | One timed 12-second prompt; no editorial cut inside the intro |
| 12.0–16.0s | `03-living-room.png` | 3% left-to-right slider with subtle parallax | First clean cut after the intro |
| 16.0–20.0s | `04-kitchen.png` | Smooth 8° clockwise micro-arc around the fixed island | Gentle ease-in/out; island remains the fixed anchor |
| 20.0–24.0s | `06-primary-bedroom.png` | Slow 3% optical push toward the bed headboard | Softer movement for one visual breath |
| 24.0–28.0s | `08-backyard-patio.png` | Shallow curved pullback keeping the rear facade centered | Finish on a clean hold for title/logo overlay |

`07-bathroom.png` is optional replacement B-roll if one of the interior generations fails quality control.

## Door-opening construction

The aerial, facade approach, door animation, and verified entry are generated as one continuous 12-second intro using all three chronological references. The model must pass through a brief dark threshold occlusion while resolving into the supplied foyer; the first editorial cut occurs only after the foyer hold.

## Generation rules

- Model: Seedance 2.0, standard mode, 4:3, 1080p, high bitrate.
- Generate one scene per clip with one dominant camera movement.
- Preserve exact architecture, furniture, window placement, finishes and lighting from first frame to last.
- No people, text, logos, redesign, invented rooms, geometry drift, lens breathing or floating 3D motion.
- Generate smooth physical movement; create the strong speed ramps during editing.
- Inspect the first, middle and last frame of every clip before assembly.

## Audio direction

- Minimal modern electronic pulse, 112–118 BPM.
- Low cinematic rise during the drone descent.
- Tactile door latch and soft hinge sound at 5.2s.
- Subtle movement whooshes only on the two strongest speed ramps.
- Warm low-frequency resolve on the backyard end frame.

## Text treatment

Keep the property footage clean until the final 0.7 seconds. Optional end line: `A home that feels like home.` Use small refined typography with generous spacing; no oversized sales copy.
