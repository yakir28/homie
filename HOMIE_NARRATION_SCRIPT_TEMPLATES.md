# Homie — Narration & Script Templates

These are **voiceover/narration script templates**, not AI video-generation prompts — a separate content type from [`HOMIE_REFINED_TEMPLATE_PROMPTS.md`](HOMIE_REFINED_TEMPLATE_PROMPTS.md). That file describes what the camera does; this file describes what gets **said** over it (or read aloud by the agent on camera). The two can be paired: e.g. template #1 below narrated over the Video 2 walkthrough from any of the 14 hook templates.

Platform, video length, and format are configured in-app when the user creates a video — they are intentionally left out of these templates. Each template is a fill-in-the-blank structure: replace every `[bracketed]` field with the listing's real details before generating narration or handing the script to the agent.

## 1. סיור בנכס — Property Listing Walkthrough

**Fields:** `[property type]`, `[location]`, `[price]`, `[bedrooms/bathrooms]`, `[square footage]`, `[3 standout features]`, `[target buyer]`, `[tone: warm / modern / luxury]`

**Structure:**
- Opening line (first 2–3 seconds): a specific, sensory hook tied to the property's single best feature — not a generic "welcome to this beautiful home."
- Body: walk the standout features in the same order the walkthrough visits them, room by room, describing lifestyle and feeling rather than just listing specs.
- Close: one line that creates gentle urgency or invites action (a showing, a call, a link) without sounding like a hard sell.

**Guardrail:** no invented features, no price claims not in `[price]`, no comparisons to specific competing listings.

## 2. נדל"ן יוקרתי — Luxury Cinematic Narration

**Fields:** `[property type]`, `[signature feature]`, `[architectural style]`, `[target buyer lifestyle]`, `[brand tone]`

**Structure:**
- Opening line: understated, evocative, never explicitly says "luxury" — the language itself should imply it.
- Body: sell the lifestyle the space enables (how mornings, entertaining, or quiet evenings feel here), not a features list. Reference materials and craftsmanship only where they support that feeling.
- Close: a single restrained line, no exclamation points, no "don't miss out."

**Guardrail:** avoid stock luxury-copy clichés ("epitome of elegance," "unparalleled"); ground every claim in a real, visible detail from the property photos.

## 3. הכרות עם הסוכן — Agent Introduction

**Fields:** `[agent name]`, `[years of experience]`, `[specialty/niche]`, `[personality trait to convey]`, `[target audience]`, `[local area]`

**Structure:**
- Opening line: a personal, specific detail — not a generic "hi, I'm [name], your local realtor."
- Body: one credibility statement grounded in a real result or specialty (avoid vague boasting), plus one line establishing genuine local-area familiarity.
- Close: a low-pressure invitation to reach out.

**Guardrail:** no unverifiable superlatives ("#1 agent," "best in the city") unless `[years of experience]` or a real credential backs it.

## 4. סיור שכונה — Neighborhood Tour

**Fields:** `[neighborhood name]`, `[3–5 real local highlights]`, `[average home price range]`, `[who the area suits]`

**Structure:**
- Opening line: what makes this neighborhood distinct in one sentence.
- Body: walk 3–5 real highlights (parks, schools, transit, dining) in an order that matches the footage, one honest note on tradeoffs or considerations (commute, density, price) to keep it credible rather than purely promotional.
- Close: connect the neighborhood back to the specific listing or agent.

**Guardrail:** only reference amenities and price ranges the user has actually supplied — never invent local landmarks or stats.

## 5. פרומו לבית פתוח — Open House Promo

**Fields:** `[property details]`, `[date/time]`, `[key selling points]`, `[ideal buyer profile]`

**Structure:**
- Opening line: fast, attention-grabbing, states the open house is happening before anything else.
- Body: 2–3 key selling points, stated briefly — this is a promo, not a full walkthrough.
- Close: exact date, time, and address, plus a clear call to action.

**Guardrail:** date/time must be repeated at least twice (open and close) since this is often watched with sound off — pair with on-screen text overlay suggestions.

## 6. מדריך לרוכש דירה ראשונה — First-Time Buyer Education

**Fields:** `[topic: down payment / pre-approval / inspection / closing costs / etc.]`, `[audience experience level]`

**Structure:**
- Opening line: names a real, common fear or confusion first-time buyers have about `[topic]` — establishes relatability before teaching.
- Body: 3 practical, immediately usable tips, explained in plain language with no unexplained jargon.
- Close: a reassuring, non-salesy line — the goal is trust, not a pitch.

**Guardrail:** no financial guarantees or specific rate/qualification promises — general education only, direct viewers to a professional for their specific numbers.

## 7. טיפים למוכר — Home Seller Tips

**Fields:** `[topic: staging / pricing / prep / timing / etc.]`, `[local market context]`

**Structure:**
- Opening line: names the seller's real concern (leaving money on the table, sitting on market too long).
- Body: 3–5 specific, actionable tips — concrete enough that a seller could act on them today, not vague advice like "make it look nice."
- Close: connects back to the agent as the person who can execute this for them.

**Guardrail:** avoid absolute claims about price impact ("this adds $10k") unless the number is user-supplied and defensible.

## 8. עדכון שוק — Market Update

**Fields:** `[average price]`, `[days on market]`, `[inventory level]`, `[interest rate context]`, `[audience: buyers / sellers / both]`

**Structure:**
- Opening line: the single most relevant takeaway for `[audience]` stated plainly first.
- Body: translate the 3–4 data points into plain-language meaning ("this means..." not just the raw numbers) — assume the viewer does not follow real estate data regularly.
- Close: what this means for the viewer's next move, phrased as a question or gentle nudge, not a directive.

**Guardrail:** every figure must come from `[fields]` supplied by the user — never fabricate or round market data speculatively.

## 9. לפני ואחרי — Before-and-After Staging

**Fields:** `[project details]`, `[specific improvements made]`

**Structure:**
- Opening line: creates curiosity about the transformation without revealing the after shot yet.
- Body: name the specific improvements in the order the before/after cuts show them.
- Close: the impact in one line — how it changes the space's feel or appeal, not just "looks better."

**Guardrail:** describe only improvements in `[specific improvements made]` — do not claim structural or value changes not specified.

## 10. עדות לקוח — Client Testimonial

**Fields:** `[client type: buyer / seller]`, `[main challenge they faced]`, `[agent's role in solving it]`, `[outcome]`

**Structure:**
- Opening line: states the challenge plainly, from the client's point of view.
- Body: what the agent specifically did that mattered — concrete actions, not generic praise.
- Close: the outcome in the client's own voice — leave a natural placeholder like `["quote from client"]` rather than writing invented words for a real person.

**Guardrail:** never fabricate a client quote — this template only structures where a real quote goes; the actual words must come from the real client.

## Shared writing rules

- Every template opens with a hook in the first line — never a generic greeting.
- Replace all `[bracketed]` fields with real listing/agent data before use; do not ship a script with unfilled placeholders.
- Match tone to `[tone]`/`[brand tone]` fields consistently across the whole script, not just the opening.
- No fabricated statistics, prices, credentials, or client quotes — every factual claim must trace back to a field the user supplied.
- Pair with a matching visual template from `HOMIE_REFINED_TEMPLATE_PROMPTS.md` when the narration is meant to run over a generated walkthrough, so pacing and room order line up.
