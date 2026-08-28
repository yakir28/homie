---
type: map
project: Homie
status: current
---

# Technical Map

## Surface

- React / vinext web application
- marketing site, login and product workspace

## Data and authorization

- Supabase stores metadata, authorization and the generation queue
- database changes are managed through migrations

## Video generation

- a separate Node worker processes queued projects
- Runway is the current primary provider; Higgsfield remains supported
- FFmpeg assembles generated clips into the final MP4

## Media

- private Cloudflare R2 bucket named `homie`
- `templates/` contains catalog media with long-lived caching
- `videos/` contains private generated media
- playback uses time-limited signed URLs and supports byte ranges

## Core flow

`listing → selected photos → template → queued project → generated clips → assembled video → review → approval`

## Operational questions

- [ ] Where is every generation state observable?
- [ ] What retries are safe and idempotent?
- [ ] How are provider costs recorded per project?
- [ ] What alerts catch stuck or failed jobs?

ראו גם: [[03 Decisions/Decision Log|Decision Log]].
