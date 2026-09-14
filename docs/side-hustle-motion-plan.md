# Side-hustle landing page — motion plan and design direction

Saved: 2026-09-13. Status: planned, not implemented.
User requested that these applications be planned and remembered. This file is the durable project reference for future work on /side-hustle.

## Fixed context
- Audience: US beginners exploring an AI side hustle, not established real-estate service providers.
- All customer-facing copy is American English, LTR.
- Preserve Homie branding, verified pricing and working signup links.
- Primary conversion: create the first $1 watermarked video. Do not invent earnings, guarantees, speed claims or customer proof.
- References: https://animations.dev/ (public course page only); https://www.tasteskill.dev/ (reviewed; main skill installed 2026-09-13).

## Planned motion applications
Durations below are our proposed starting values, not prescriptions quoted from animations.dev.

1. Photo-to-video proof (highest priority)
   - Keep the matching source property and generated result visibly connected.
   - On explicit Play, crossfade the poster/play overlay into the ready video in 180–240ms; preserve aspect ratio and layout.
   - Keep the source image available for comparison. Never replace it with a fabricated before/after.
   - Show a loading state only while loading; expose retry on playback error.
   - Preserve play/pause, keyboard access and native playback controls.

2. CTA feedback
   - Hover: subtle color change and arrow translation up to 3px, 140–180ms ease-out.
   - Press: scale to approximately .98 for immediate feedback; never delay navigation.
   - Apply hover effects only on hover-capable devices. Give focus-visible equivalent emphasis.

3. Copy-message confirmation
   - Maintain a fixed button footprint; transition Copy message to Copied and copy icon to check in 120–180ms.
   - Announce success via role=status, after clipboard success only. Restore label after about 2.5s.
   - Provide a readable fallback if clipboard access fails. Rapid clicks must not accumulate timers.

4. FAQ expansion
   - Animate panel opening/closing and icon rotation together, 180–240ms, ease-out.
   - Use measured content height or supported layout interpolation with an instant fallback. Avoid oversized max-height hacks.
   - Preserve semantic disclosure, keyboard activation and hidden-content focus behavior.
   - Repeated clicks reverse smoothly; dynamic text and resizing must not clip content.

5. Mobile sticky CTA
   - Show only once the primary hero action is above the viewport; hide when it reappears.
   - Enter with opacity plus 8–12px upward movement, 160–220ms; allow an actual exit transition before unmounting.
   - Honor safe areas and reserve bottom space. Prevent hidden controls from receiving focus.
   - Avoid observer boundary flicker and overlapping the main CTA.

6. Page orchestration
   - Content is readable immediately. No scroll locking, long intro or invisible-until-JS sections.
   - If section reveals help, use a small one-time 8–12px offset and opacity change; no repeated large stagger effects.
   - Videos remain user-initiated. Decorative motion never competes with property proof.

## Implementation order
1. Audit current desktop/mobile interactions and establish shared motion tokens.
2. Implement playback/loading transitions and CTA states.
3. Implement copy confirmation and accessible FAQ transitions.
4. Implement sticky CTA entry/exit behavior.
5. Review the whole page for timing consistency; remove distracting motion.

## Acceptance checks
- Test desktop, 390px mobile, keyboard-only and prefers-reduced-motion.
- Reduced-motion removes displacement, scaling and spring effects; all state changes remain understandable.
- No layout jumps, clipped panels, hidden focus targets or horizontal overflow.
- Test rapid toggles, failed playback, failed clipboard, resizing, and back navigation.
- Avoid React state updates on each animation frame. Prefer transform/opacity; profile height transitions if used.
- Check build, scoped lint and browser behavior. Motion completion must never gate signup/navigation.

## Taste Skill assessment and future usage
- Useful as a structured visual audit for hierarchy, typography, spacing, repetition and consistency.
- The site labels v2 experimental and offers redesign-skill specifically for existing projects.
- Prefer a scoped redesign audit before additional style changes. Do not blindly layer every offered skill.
- Preserve the brief: American side-hustle audience, product proof, one primary conversion, existing brand.
- Do not introduce dark mode, new libraries, dramatic motion or another redesign solely because a generic skill suggests them.
- Installed on 2026-09-13 at /Users/yakir/.codex/skills/design-taste-frontend from Leonxlnx/taste-skill, skills/taste-skill. Installation was explicitly requested. Not yet applied to the landing page; read the installed SKILL.md before use.
- Taste addresses visual decision-making; animations.dev provides public context for motion quality. Neither substitutes for actual conversion evidence or usability checks.


## Implementation — 2026-09-13
Implemented action-based CTA motion, video overlay fade with loading/retry states, fixed-footprint copy confirmation, reversible CSS grid FAQ disclosure transitions, and a persistent mobile CTA with animated entry/exit and inert hidden state. Reduced-motion overrides remove transitions and displacement.

Verified: production build; scoped ESLint (no errors, three existing image warnings); browser FAQ click/Enter/Space toggling, copy success, video playback (readyState 4), mobile 390px with no horizontal overflow, and sticky visibility. Reduced motion and failure paths reviewed in code; network/clipboard failure injection and OS reduced-motion browser testing were not performed.

## Scroll hero update
The hero now pins inside a native CSS view timeline. Initial headline and source photo crossfade into a full-height, uncropped video frame as the visitor scrolls. Reverse scrolling reverses the sequence. Playback remains explicit. Reduced-motion and browsers without view timelines retain the static comparison layout. Verified desktop initial/revealed states and mobile reveal/overflow; production build passed and scoped lint has no errors. No JS scroll listeners or per-frame React state.
