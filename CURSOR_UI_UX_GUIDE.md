# Homie — Cursor UI/UX handoff

Updated: 7 September 2026. Read this document before editing the customer-facing website or app.

## Product

Homie turns property listing photos into AI-generated real-estate videos. The audience is real-estate agents and office teams. The product is **template-first, not prompt-first**: select a visual style, choose a property, set output preferences, and create. Keep generation technology out of the primary user experience.

The interface is English and left-to-right. The owner may give instructions in Hebrew; do not translate the product UI unless requested.

## Source of truth

- This document records the current design direction and recent decisions, not a guarantee that every existing screen already follows them.
- Inspect the current implementation before changing it. The repository contains legacy CSS and older product documents.
- `HOMIE_PRODUCT_UI_CONTEXT.md` is historical context: its free-trial, warm-background, serif-font and navigation recommendations are partly outdated. Do not reintroduce them automatically.
- Prefer the owner's latest explicit request when it conflicts with this guide.

## Visual direction

Premium, calm, readable and visual: **white + sage-green gradients + selective frosted glass**. Real-estate photography and video are the focus. Avoid turning the app into a dense technical dashboard.

### Themes and tokens

Use existing CSS variables instead of scattering new literal colors.

| Token | Light | Dark |
| --- | --- | --- |
| `--paper` | `#ffffff` | `#121210` |
| `--surface` | `#ffffff` | `#1c1c18` |
| `--ink` | `#161614` | `#f2f0e8` |
| `--muted` | `#7a7c73` | `#9a9c90` |
| `--line` | `#e2ded2` | `#2c2c26` |
| `--sage` | `#748668` | `#8fa179` |
| `--sage-dark` | `#566149` | `#bccca9` |
| `--sage-soft` | `#e5e9dd` | `#242a1e` |

These are the current base tokens in `app/globals.css`; inspect component overrides too. Dark mode is driven by `data-theme="dark"`. The white-canvas requirement applies across light-mode pages, including authentication and the app; do not turn dark mode white.

Use glass on navigation, selected panels and overlays: subtle translucency, fine border, restrained shadow and blur. Provide an opaque fallback. Green gradients should support the composition, not obscure text. Avoid beige page backgrounds, neon colors, excessive glow and unnecessary decorative sparkles.

### Typography

- `--sans`: Inter, Arial, sans-serif — body, controls, inputs, pricing and metadata.
- `--serif`: Urbanist, Inter, Arial, sans-serif — display headings. The variable name is legacy; Urbanist is not a serif.
- `--mono`: aliases `--sans`.
- Readability is a priority: the owner replaced the previous hard-to-read UI font. Do not restore Raleway for controls.
- Recommended direction for new work: 14–16px controls, 16px+ body copy, comfortable line height and clear contrast. Existing tiny labels are not a design requirement.
- Headings can be editorial and spacious, but responsive layouts must not push the main action far below the fold.

### Components

- Rounded cards and dialogs, restrained borders and shadows, consistent spacing.
- Primary actions use sage; secondary actions are quiet but clearly interactive.
- Consistent outline SVG icons; avoid mixing emoji, text glyphs and unrelated icon families.
- Selection needs a clear border/background state, not only a barely visible color change.
- Keep disabled, loading, error, empty and success states explicit.

## Core app flow — preserve this structure

### Template preview and creation

One split popup:

- Left: template video with custom media controls, not native browser controls.
- Right: template title/category, recommended aspect ratio, short suitability description, three compact selectors and the Create button.
- Close button belongs on the right, outside the video.
- On mobile, stack responsively and keep actions reachable.

The three selectors are **Listing**, **Format**, and **Resolution**. Each opens a focused selection dialog and returns to the same preview. Show the selected values on the buttons. Do not add a multi-page wizard or restore the old intermediate generation popup / “Video output” banner.

For the listing picker, keep the heading, search field and close button fixed. **Only the property-card list scrolls.** Preserve keyboard access, Escape dismissal and focus behavior. Apply the same fixed-close principle to other long dialogs.

The Create button shows the credit cost before submission. Also show available balance and explain insufficient credits. Never hide the cost until after clicking.

Current temporary resolution pricing multiplies the template's base credit cost:

| Resolution | Multiplier |
| --- | --- |
| 480p | ×1 |
| 720p | ×2 |
| 1080p | ×3 |
| 4K | ×5 |

Default resolution is currently 1080p. Format defaults to the template's supported recommendation. These prices may change later: do not hardcode a second pricing table in UI code.

Pricing is returned by `get_video_pricing`; generation uses `queue_priced_video_project`. Preserve server-side price validation, balance checks, workspace authorization and idempotent request IDs. Changing presentation must not alter billing or trigger a real generation during testing.

### Explore, listings and navigation

- Template gallery: prominent previews, search, category chips and focused filters. No duplicate category rows and no visible “Sort by” control unless explicitly requested again.
- Sidebar: show three listings initially; Show more reveals additional properties. Do not restore New listing in that specific slot. Keep account controls reachable; avoid making the whole sidebar a long scrolling page.
- Listing details: photo carousel and a compact mapping action that opens the house/room mapping board.
- Photo upload supports clicking and drag-and-drop. Preserve file validation and mapping persistence.
- My videos includes generation/review states; do not label pending output as complete or approved.

## Landing page decisions

- White canvas, soft green gradients and glass accents.
- Hero, template carousel and Inside Homie videos autoplay muted and inline without media controls.
- Carousel cards are plain videos: no card titles, descriptions, CTA overlays or hover animation. Preserve the looping carousel motion and reduced-motion handling.
- Inside Homie sits in a rounded gray/glass container.
- The first-video offer is **$1, not free**. Never promise working checkout if the relevant payment flow is not available. UI copy and actual billing availability must agree.
- Do not restore removed sections: How it works, “Built for solo agents and office teams”, or “Bring the photos. Homie builds the story”. Do not restore the “Explore the full template library” button beneath the carousel.
- Announcement banner has readable text and an accessible close target, without a New badge.
- No page-level horizontal scrollbar. Wide carousels must be contained locally; avoid using `100vw` where it includes the vertical scrollbar width. Do not conceal layout bugs with a blanket overflow rule.

## Code map

| Area | Files |
| --- | --- |
| Global theme, shared styles | `app/globals.css`, `app/layout.tsx` |
| Landing page | `app/page.tsx` |
| Landing overrides | `app/landing-glass.css`, `app/landing-typography.css`, `app/landing-pricing.css`, `app/landing-trial-popup.css` |
| Auth | `app/login/page.tsx` and auth styles in `app/globals.css` |
| Main app, sidebar, many screen components | `app/app/page.tsx` |
| Template preview | `TemplatePreviewModal` in `app/app/page.tsx`, `app/app/template-detail.css` |
| Creation selectors and quote | `app/app/CreateVideoWizard.tsx`, `app/app/video-creation-controls.css` |
| Listing search styles | `app/app/listing-chooser.css` |
| Template filtering | `app/app/TemplateFilters.tsx`, `app/app/template-filters.css` |
| Media | `app/app/TemplateMedia.tsx` |
| House mapping | `app/app/ListingMapBoard.tsx`, `app/app/listing-map-board.css`, `app/app/listings/[listingId]/mapping/page.tsx` |
| Public price helpers | `lib/public-pricing.ts` |
| Resolution pricing migration | `supabase/migrations/20260907081023_resolution_credit_pricing.sql` |

Technical stack: React 19 + TypeScript, vinext/Vite with Next-style app routing, Supabase, Cloudflare tooling. This is not a conventional Next.js build despite familiar route filenames. Follow `package.json` scripts. `crm/` is a separate subproject; do not restyle it as a side effect of customer-app work.

## Safe implementation workflow

1. Inspect the target component, CSS imports and later overrides. `globals.css` is large and contains historical rules; the first matching selector may not win.
2. State the intended visual change briefly. Keep scope focused; do not redesign unrelated screens or replace infrastructure.
3. Reuse tokens and existing components. Scope selectors to avoid changing nested dialog headings or unrelated controls.
4. Preserve authentication, uploads, mapping, favorites, quote calculation, generation and payment handlers.
5. Test desktop and narrow mobile widths in both themes. Check actual computed layout, not only source code.
6. Check long addresses, many listings, empty search, insufficient credits, loading/errors, keyboard focus and dialog close accessibility.
7. Run relevant checks: `git diff --check`, `npx tsc --noEmit`, and `npm run build` when appropriate. `npm run dev` starts local development. Report pre-existing failures separately; do not claim a full pass when checks fail.
8. Do not commit secrets, generated media, local caches or unrelated changes. No production deployment, migration or paid generation solely to verify a visual edit.

## Suggested instruction to Cursor

> Read `CURSOR_UI_UX_GUIDE.md`, inspect the relevant current components and CSS, and improve the UI/UX of [screen]. Preserve Homie's white/sage/glass direction, dark mode and the short creation flow. Keep existing data and billing behavior intact. Implement a focused responsive change, verify its interactions, and summarize changed files and any unverified behavior.
