# Homie — Minimal white glass

13.5 seconds, 1080 × 1440, 30 fps. Current output: `out/homie-glass-container.mp4`.

White canvas with a shared frosted glass container wrapping the upload box, five photo cards, and walkthrough. Soft blue and light green gradient glare sits behind the container. No surrounding headlines, branding, or end card. Photos enter rapidly, land in thumbnail slots, and the box expands into the matching existing walkthrough at 4 seconds.

Assets: `prompt four pulse tour/` in the repository. The existing walkthrough is accelerated. The interface illustrates an upload flow, not a live generation service.

Run `npm run studio -- --port=3005` or `npm run render` here. Edit `src/index.tsx`.

Previous exports remain in `out/`.

## Logo loading loop

`HomieLoading`: 3 seconds, 720 × 480, silent seamless loop. Uses the official Homie symbol at `public/brand/transparent/homie-mark-charcoal.png`, animated with a subtle breathing motion and a soft sheen. White background; no text or surrounding elements.

Run `npm run render:loading`. Output: `out/homie-logo-loading.mp4`. Source: `src/Loading.tsx`.

Embed with `<video src="homie-logo-loading.mp4" autoplay muted loop playsinline aria-label="Loading"></video>`. This asset has not been wired into the application.
