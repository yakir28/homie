# Homie — Product and UI/UX Context

> Living context document for product design and frontend implementation.
> Last updated: August 6, 2026.

## 1. Product Summary

Homie is an AI video creation platform for real-estate professionals. Users connect their Zillow account, import a property listing and its photos, choose a ready-made video template, generate a home-tour video, review it, and approve the final result.

Homie is intentionally template-first rather than prompt-first. The user should not need to understand prompting or video-generation technology. The product experience should feel like choosing a professionally art-directed video style, not operating an AI tool.

### Core promise

Turn existing listing photos into polished property-tour videos through a fast, guided, zero-prompt workflow.

### Initial target users

- Solo real-estate agents
- Real-estate office teams

### Initial distribution formats

- Instagram Reels
- TikTok
- Instagram/Facebook Stories
- Zillow listings

### Business model

- Monthly subscription with included credits
- Free trial
- Credits are consumed by video generation
- Additional credit purchases may be offered to paying subscribers

### Required safeguard

No generated video is treated as final or publishable until the user explicitly reviews and approves it.

## 2. Product Principles

1. **Templates, not prompts.** Users select a visual treatment from a curated library. Any underlying skills or prompts remain invisible system implementation details.
2. **Listings, not files.** The primary object is a property listing. Its photos and generated videos live inside it.
3. **Visual selection over configuration.** Prefer large moving previews and recognizable examples over technical settings.
4. **A short path to the first result.** Connecting Zillow and creating a first tour should feel guided and achievable in one session.
5. **Approval before completion.** Generation leads to a review state, never directly to publishing.
6. **Professional and editorial.** The interface should feel premium, calm, trustworthy, and appropriate for high-value property marketing.
7. **Credits must be understandable.** Always show cost before generation, remaining balance, and what happens when credits are insufficient.

## 3. Reference Direction

Primary reference: [Cheeppy](https://cheeppy.com)

The supplied screenshots cover Cheeppy's marketing homepage, authentication, template exploration, integrations, imported products, pricing, credit top-ups, account menu, light mode, and dark mode.

Cheeppy's product model is useful because it uses the same core interaction philosophy Homie needs: upload or connect a source, browse curated styles without prompting, generate an AI result, and pay through credits. Homie should adapt that structure to real estate rather than reproduce Cheeppy's ecommerce language or exact layout.

### Patterns to carry into Homie

- Fixed left application sidebar on desktop
- Large editorial serif headings paired with a clean sans-serif UI font
- Small uppercase/monospace eyebrow labels and metadata
- Warm neutral surfaces with a muted natural accent color
- Optional dark and light themes
- Image/video-heavy masonry or editorial template gallery
- Search, format tabs, category chips, favorites, and filters
- Full-bleed previews with restrained overlays
- Strong empty states with one obvious next action
- Integration cards and clear connected/disconnected states
- Subscription cards with monthly/yearly selection and a recommended tier
- Persistent credit balance near the account identity
- Split-screen authentication with aspirational imagery
- Minimal, direct CTAs

### Patterns to reinterpret

| Reference concept | Homie adaptation |
| --- | --- |
| Explore styles | Explore video templates |
| Products | Property listings |
| Product photo upload | Zillow connection and listing import |
| Connected stores | Connected listing sources/accounts |
| Photobook | My videos / Projects |
| Images / Videos / Creators tabs | Reels / Stories / Zillow or Templates / Favorites |
| Style creator | Future template/skill system; exclude from initial customer navigation |
| Slots | Concurrent generations or active projects, only if needed later |
| Use style | Preview template / Use template |
| Generated product image | Generated home-tour video |

### Patterns not to copy blindly

- Ecommerce-specific navigation and terminology
- Creator marketplace features before they are part of Homie's strategy
- Dense or vague credit rules
- A layout that prioritizes desktop so heavily that mobile review becomes difficult
- Hover-only discovery; template details must work on touch devices
- Publishing without an explicit user approval checkpoint

## 4. Primary User Journey

### First-time journey

1. User lands on Homie's marketing page.
2. User starts the free trial or creates an account.
3. Onboarding explains the three-step model: connect Zillow, choose a listing and template, create a video.
4. User connects Zillow.
5. Homie imports available listings and property photos.
6. User selects a listing.
7. User browses video templates with motion previews and format labels.
8. User chooses a template.
9. Homie shows a generation summary, required credits, available balance, and target output format.
10. User confirms generation.
11. Homie shows progress without requiring the page to remain open.
12. User reviews the generated video.
13. User approves the result or requests another generation/variation.
14. After approval, user downloads the correct format or proceeds to a supported publishing/export flow.

### Returning-user journey

1. User lands on the Listings or Videos dashboard.
2. User sees active generations, drafts awaiting approval, and recently completed videos.
3. User selects an existing listing or imports a newly available listing.
4. User creates another video using a template.

## 5. Information Architecture

### Public website

- Home
- How it works
- Templates
- Use cases
- Pricing
- FAQ
- Log in
- Start free

### Authenticated application

**Create**

- Home / Overview
- Templates
- Listings
- My Videos
- Favorites

**Workspace**

- Integrations
- Team — for office/team plans
- Activity

**Billing**

- Subscription
- Buy Credits

**Account menu**

- Profile
- Settings
- Appearance: light/dark/system
- Help
- Sign out

Navigation labels should be validated through prototype testing. In particular, test whether users understand “Listings” and “My Videos” more quickly than more abstract labels such as “Projects” or “Studio.”

## 6. MVP Screens

### 6.1 Marketing homepage

Purpose: communicate the outcome immediately and convert users into the free trial.

Recommended hero structure:

- Editorial headline focused on turning listing photos into property-tour videos
- Short supporting sentence emphasizing no filming and no prompting
- Primary CTA: **Create your first tour**
- Secondary CTA: **Explore templates**
- Free-trial/credit note near the CTA
- Before/after composition: listing photos on one side, finished vertical video on the other
- Muted auto-playing preview, respecting reduced-motion preferences

Suggested message direction, not final copy:

> Turn listing photos into home tours that move.

### 6.2 Authentication

- Split-screen desktop layout
- Left: property-photo collage with Homie wordmark and value proposition
- Right: login/sign-up form
- Email and password
- Google and Apple options if supported
- Password recovery
- Terms and privacy links
- On mobile, prioritize the form and reduce the collage to a compact header/visual

### 6.3 Onboarding

Use a visible three-step checklist:

1. Create workspace/profile
2. Connect Zillow
3. Generate first home tour

For office teams, workspace setup may include office name and inviting teammates, but invitations should be skippable during first-run onboarding.

### 6.4 Overview dashboard

- Welcome header
- Remaining credits and next renewal date
- Primary CTA: **Create a video**
- Onboarding checklist when incomplete
- Recent listings
- Videos awaiting approval
- Active generation progress
- Recently approved videos
- Empty state directs the user to connect Zillow

### 6.5 Template explorer

This is Homie's primary discovery screen and should carry the strongest influence from the reference gallery.

- Search field
- Format tabs: All, Reels, TikTok, Stories, Zillow
- Category chips, initially based on useful real-estate groupings such as Luxury, Modern, Warm, Minimal, Family, Coastal, Urban, Fast-paced, Cinematic
- Filter control for duration, aspect ratio, credit cost, photo count, and optionally music/voiceover availability
- Editorial grid of looping muted video previews
- Favorite action
- Template title
- Short style descriptor
- Duration
- Aspect ratio/output compatibility
- Required or recommended number of listing photos
- Credit cost
- CTA: **Use template**

Template cards should expose core information without hover. Hover may reveal playback or secondary details on desktop, but cannot be required.

### 6.6 Template detail

- Large video preview with sound control
- Template name and description
- Supported formats and aspect ratios
- Expected duration
- Required/recommended photo count
- Credit price
- Example property types
- Favorite action
- Primary CTA: **Use this template**
- Optional “More like this” section

### 6.7 Zillow integration

- Connection status and connected account identity
- Primary Zillow integration card
- Connect, reconnect, sync, and disconnect actions
- Last successful sync time
- Number of imported listings
- Clear explanation of what Homie imports
- Permission/error states written in plain language
- Upgrade gate only when the user's plan genuinely restricts the integration

Because the exact Zillow authentication and data-access method is not yet confirmed, the design must avoid promising a particular OAuth or API flow until backend feasibility is validated.

### 6.8 Listings

- Search by address, city, or listing identifier
- Filter by active/inactive status and video status
- Listing cards with cover photo, address, status, imported photo count, last sync, and number of videos
- CTA on each listing: **Create video**
- Empty state: **Connect Zillow to import your listings**
- Sync feedback and partial-import/error handling

### 6.9 Listing detail

- Property identity and listing status
- Photo gallery imported from Zillow
- Selection state for photos used in a video
- Existing generated videos
- Create-video CTA
- Sync/update action
- Missing-image or unavailable-listing states

Detailed listing metadata is intentionally not specified yet; it should be driven later by the generation templates/skills and available Zillow data.

### 6.10 Create-video flow

Recommended guided sequence:

1. Choose listing
2. Choose template
3. Review selected photos and order, if the template permits user adjustment
4. Confirm output format
5. Review cost and generate

The system—not the user—owns prompts and generation instructions. Do not show a prompt box in the default experience.

### 6.11 Generation state

- Template and listing summary
- Progress state with human-readable stages
- Estimated completion only if trustworthy
- User may safely leave the page
- Completed/failed notification
- Failed jobs must not consume credits, or the refund behavior must be stated clearly
- Retry action with preserved inputs

### 6.12 Video review and approval

- Large player in the target aspect ratio
- Listing and template context
- Status: Awaiting approval
- Primary action: **Approve video**
- Secondary actions: generate another version, change template, or return to listing
- Credit cost for any regeneration shown before confirmation
- After approval: download/export actions become prominent
- Approved result receives a clear timestamp and approving user for team accountability

### 6.13 My Videos

- Tabs or filters: All, Generating, Awaiting approval, Approved, Failed
- Video thumbnail/preview
- Property address
- Template name
- Output format
- Creator/team member
- Date
- Status
- Quick actions appropriate to state

### 6.14 Subscription

- Monthly/yearly toggle
- Free trial clearly explained
- Tier cards aimed at solo agents and teams
- Each tier shows included monthly credits and an understandable estimate of video volume if generation costs are stable
- Recommended tier indication
- Current-plan state
- Team limits and roles only on relevant tiers
- Avoid inventing prices or plan names until commercial decisions are made

### 6.15 Buy Credits

- Available to eligible paid subscribers if this rule is adopted
- Current credit balance
- Credit packages and prices
- Approximate number of videos per package when possible
- Expiration/rollover rules displayed before purchase
- If locked, show a centered upgrade state and direct CTA to plans

### 6.16 Team management

- Office/workspace name
- Members and roles
- Invite member
- Pending invitations
- Role model can begin with Owner, Admin, and Agent
- Shared versus personal credits must be decided before implementation
- Activity should record generation and approval actions

## 7. Core Objects and States

### Listing

- Importing
- Active
- Inactive/off-market
- Syncing
- Sync error
- Disconnected source

### Video

- Draft/configuring
- Queued
- Generating
- Awaiting approval
- Approved
- Failed

### Integration

- Not connected
- Connecting
- Connected
- Syncing
- Permission expired
- Error

### Subscription/credits

- Trial active
- Trial expired
- Paid active
- Past due
- Canceled but active until period end
- Insufficient credits

Every state should have a visible next action. Status should never depend on color alone.

## 8. Visual Design System

### Overall character

- Premium editorial real-estate aesthetic
- Calm and confident, not futuristic or “AI neon”
- Generous whitespace
- Strong property imagery and motion previews
- Thin borders and restrained shadows
- Mostly square or subtly rounded geometry
- Minimal decorative UI

### Color direction

Use the reference's warm neutrals and natural accent as a starting direction, not fixed production values.

**Light theme direction**

- Canvas: warm ivory/off-white
- Surface: soft white
- Primary text: charcoal/near-black
- Secondary text: warm gray
- Accent: muted olive/sage
- Border: warm light gray

**Dark theme direction**

- Canvas: deep charcoal, not pure black
- Surface: slightly lighter charcoal
- Primary text: warm off-white
- Secondary text: cool/warm gray with accessible contrast
- Accent: desaturated sage
- Border: subtle gray

Semantic colors for success, warning, error, and information must remain distinct and accessible in both themes.

### Typography

- Display: refined editorial serif for page titles, hero copy, and template titles
- Interface/body: highly legible neutral sans-serif
- Eyebrows/metadata: uppercase mono or mono-like face with increased letter spacing
- Use italics in the serif sparingly for highlighted words
- Never use the decorative display style for long body text or dense controls

### Layout

- Desktop sidebar approximately 240–280 px
- Main content uses a generous max width while galleries can expand fluidly
- 8 px base spacing system
- Large page-title zones with compact uppercase subtitles
- Gallery rhythm may vary card sizes, but status and actions must remain predictable
- Sticky actions are appropriate in creation and review flows

### Controls

- Primary button: solid sage or near-black depending on theme/contrast
- Secondary button: bordered neutral
- Destructive button: semantic red, used sparingly
- Pills for categories and format filters
- Active navigation uses a subtle filled surface plus accent indicator
- Clear focus rings for keyboard navigation

### Motion

- Template previews may auto-play muted when visible
- Pause previews off-screen
- Respect `prefers-reduced-motion`
- Avoid constant decorative movement in navigation or billing screens
- Generation progress can use subtle motion but must also provide text status

## 9. Responsive Behavior

### Desktop

- Persistent sidebar
- Wide editorial gallery
- Split layouts for auth and review where helpful

### Tablet

- Collapsible sidebar or compact rail
- Two-column template/listing grids
- Review controls below or beside video based on orientation

### Mobile

- Bottom navigation or drawer with no more than five primary destinations
- Single-column cards
- Full-width vertical video preview
- Sticky bottom CTA in create and approval flows
- Filters open in a sheet
- Credits accessible from account/billing, not necessarily persistent in every view
- Touch targets at least 44×44 px

The app should support review and approval comfortably on mobile because agents are frequently away from a desk.

## 10. Content and Terminology

### Preferred words

- Template
- Listing
- Home tour
- Video
- Generate/create
- Review
- Approve
- Credits
- Connect Zillow
- Import listings

### Avoid in customer-facing UI

- Prompt
- Skill
- Model parameters
- Inference
- Job payload
- Scrape/scraper
- Product/store language inherited from the reference

### Voice

- Concise
- Professional
- Helpful
- Outcome-oriented
- Transparent about costs and status

## 11. Accessibility and Trust

- Meet WCAG 2.2 AA contrast targets
- Keyboard access for all controls
- Visible focus states
- Captions/transcripts for any template preview containing narration
- Do not rely on hover or color alone
- Pause controls for auto-playing media
- Descriptive labels for property and template imagery
- Confirm credit cost before generation
- Confirm destructive actions such as disconnecting Zillow or deleting a video
- Make AI generation and approval status explicit
- Preserve an audit trail of who approved a team video

## 12. Scope Boundaries for the First Design Phase

### In scope

- Marketing page direction
- Authentication
- Onboarding
- Application shell/navigation
- Template discovery and template detail
- Zillow connection concept
- Listings and listing detail
- Guided video creation
- Generation states
- Review and explicit approval
- My Videos
- Subscription and credits
- Foundational team management
- Responsive light/dark design system

### Not yet defined

- Exact AI video-generation provider or implementation
- Exact prompts and skills behind each template
- Exact listing metadata used by templates
- Zillow API/authentication feasibility and constraints
- Direct publishing behavior for social networks or Zillow
- Pricing, credit cost per generation, rollover, and refund rules
- Final plan names and limits
- Exact collaboration permissions and shared-credit rules
- Airbnb integration timing; it is part of the broader vision but Zillow is the initial confirmed source

## 13. Decisions Confirmed by the Founder

- The product is named **Homie**.
- Primary customers are solo agents and real-estate office teams.
- Homie creates home-tour videos from property photos.
- Zillow is the initial connection/import source.
- Users choose from templates rather than writing prompts.
- Internal skills and prompts will be supplied later for generation.
- Initial outputs target Reels, TikTok, Stories, and Zillow listings.
- Monetization uses a monthly subscription with credits and a free trial.
- User approval is required.
- Design and UI/UX come before backend implementation.

## 14. Assumptions Requiring Validation

- Users can browse templates before selecting a listing.
- Users may favorite templates.
- A generated video can have multiple variations.
- Agents may change photo order when allowed by a template.
- Team workspaces share listings and videos.
- Team approvals should record the approving member.
- Additional credits may be purchased only by paying subscribers.
- Both light and dark themes are desirable because both are present in the reference.
- Airbnb will be considered after the initial Zillow-based experience.

## 15. Open Product Questions

These should not block early visual design but must be answered before implementation of the affected flows:

1. Does Zillow provide the required authorized connection and listing-photo access for Homie's intended use, or will another compliant import mechanism be needed?
2. Are credits shared at the office level or allocated per agent?
3. Who can approve a video in a team: any agent, only its creator, or an admin?
4. Can users reorder/remove photos, or does every template fully control selection and sequence?
5. How many outputs does one generation create, and how are variations charged?
6. What are the final durations and aspect ratios for each destination?
7. Will Homie support download only in the MVP, or direct publishing as well?
8. What happens to unused monthly credits?
9. What is included in the free trial, and is a payment method required?
10. Should Airbnb appear as “coming soon,” remain hidden, or enter the first release?

## 16. Design Acceptance Criteria

The initial UI/UX direction is successful when:

- A new user can explain Homie's value from the hero without knowing AI terminology.
- A new user can identify how to connect Zillow and import listings.
- A user can find and understand a template without opening technical settings.
- The cost of generation is visible before credits are spent.
- Generation, failure, awaiting-approval, and approved states are unmistakable.
- A user cannot confuse a generated draft with an approved final video.
- A solo agent can create and approve a tour on mobile.
- A team can see who created and approved a video.
- Empty and error states always offer a clear recovery action.
- The interface feels inspired by the reference's editorial restraint while remaining recognizably built for real estate.

