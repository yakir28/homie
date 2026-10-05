# Grand Entrance — Template Plan

Reference: "Some Realtors knock on the front door. I made my own entrance." (9:16, 48 s). Contact sheet in `reference/`.

## Decisions (2026-10-05)

- **Fixed brand avatar.** One fictional Homie presenter is generated once, stored with the template, and sent as an extra reference image with every generation, so the same person appears in every video. Agents do not upload their own face.
- **No captions.** The film is the generated video only.
- Format 9:16, target 20–24 s.

## Story

| Time | Beat | References |
|---|---|---|
| 0–4 s | The avatar sits in an open helicopter doorway above the neighborhood, grins at camera, and jumps | avatar + aerial |
| 4–6 s | Lands on the lawn in a burst of dust and grass | avatar + facade |
| 6–9 s | Walks out of the settling dust toward the house, straightening his jacket; crash zoom past him into the facade | avatar + facade |
| 9–24 s | FPV-style tour: low exterior orbit, then fast glides through living, kitchen, stairs, bedroom, bathroom; whip / motion-blur cuts between rooms (never a continuous flight that invents hallways) | listing photos |

## Demo assets (Higgsfield gpt_image_2_5)

Avatar options (2k, high): 322b96b8-20ed-4e0a-9d8a-27e6d004bc86, ed090a93-7a70-4519-9acb-883a894ac928, 61d4f7c2-b36b-478e-99b9-3d541d92b89f

| View | Job ID |
|---|---|
| Facade | e5b25de3-bebd-43c8-8108-e1bd5bd340ff |
| Aerial 45° | 3ae6b68b-5527-45d7-99ae-19edc707afc5 |
| Living | 9a76facd-6bc6-4e4e-b738-928a5e809bc9 |
| Kitchen | 8be8706b-e5e1-443c-bcff-0f44689f1976 |
| Hall and stairs | b848df3c-9fb4-4bfd-ad82-c6f75ecdfdd9 |
| Primary bedroom | dbbef418-fa27-4cce-b29f-cb8966650149 |
| Primary bathroom | 20c2211a-1d20-4539-914f-bcef53b683e7 |

## Product changes needed

- `generation_config.presenter_reference`: R2 key of the avatar image; the reference planner adds it to the opening chapter only (it counts toward the per-request reference limit).
- Template direction: the presenter is the only person allowed; property locks stay unchanged.

## Chosen avatar

Option 1: `322b96b8-20ed-4e0a-9d8a-27e6d004bc86` (chosen 2026-10-05).

## Video chapters (Seedance 2.5 omni_reference, 1080p, 9:16, high bitrate)

| Chapter | Refs | Job ID |
|---|---|---|
| 1 (10 s) helicopter → jump → dust landing → walk → crash zoom; native wind/rotor/dust audio | avatar, aerial, facade | 2ade7092-a3a5-4f2c-9495-526cd0e2cf0a |
| 2 (14 s) FPV: exterior orbit → living → kitchen → stairs → bedroom → bathroom | facade, living, kitchen, hall, bedroom, bath | d5e1140c-b36d-4f27-abe6-907913171c44 |
