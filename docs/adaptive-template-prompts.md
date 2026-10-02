# Adaptive creative templates

The ten catalog effect templates now use `reference_planner_version: 2` and a frozen `creative_recipe` in each new project's template snapshot. The two custom prompt/Director entries remain unchanged.

Recipes live in `lib/video-prompts/template-directions.mjs`. Each separates mood, signature opening, atmosphere and camera grammar. The template may intentionally add rain, a puddle, relighting, a temporary glass layer or blueprint materialization while the photographed property remains the identity anchor. Demo-specific room lists, furnishings and locations are removed. Drone-style arrivals retain their rhythm but restrict inferred viewpoints to visible geometry.

The first chapter receives the signature opening; continuation chapters receive mood, treatment and motion without restarting that effect. Blueprint layers resolve before continuation. Single-image input develops one shot rather than inventing a tour. No new vision classifier is used: the generation model interprets reference contents and the conditional directions. Reference order remains supplied order. Complex inference, particularly aerial geometry and glass/reflection physics, still requires visual quality review.

Existing snapshots stay on the original planner, preserving resumed request fingerprints. Template settings were updated using `scripts/update-template-directions.mjs`, which validates coverage of every active non-custom template before updating. Provider, model, resolution, duration and audio settings are preserved. This is a data update, not a schema change.

Verification: 90 video tests passed; live read-only audit passed all 12 active entries; database readback confirmed version 2 for all ten effect templates. No paid generation was submitted for this change. Next visual check should compare Reflection Reveal and GTA Drop on the same reference sets as their earlier outputs, checking identity, opening effect, transitions and repeated hooks.
