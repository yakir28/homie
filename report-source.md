# Homie pricing unit economics

Audience: Homie founders / product team  
Date: 2026-09-06  
Scope: Variable economics of Higgsfield generation, Cloudflare R2 storage, Polar collection fees, and an approximate marketing allocation. Engineering payroll, support, Supabase/Vercel compute, tax, refunds, and chargebacks are excluded.

## Assumptions

- Higgsfield Plus reference rate: $49 for 1,000 credits, or $0.049/credit. The signed-in CLI reports a Plus account. Higgsfield's live `generate cost` endpoint was used for model costs.
- Finished-output reserve: 20% above raw generation cost for quality retries/regenerations. This is a planning assumption and must be replaced with production telemetry.
- Marketing reserve: 15% of revenue for an early-stage product. The 2026 private B2B SaaS median is 8% of ARR; 15% is deliberately more conservative for launch/growth.
- Polar Starter: 5% + $0.50 per transaction. International cards can add 1.5%.
- R2 Standard: $0.015/GB-month; first 10 GB-month, 1M Class A and 10M Class B operations are free; internet egress is free.
- Local final outputs indicate roughly 8–17 MB for 18-second exports and roughly 70–106 MB for several 30-second 1080p exports. A 30–100 MB planning range is used.

## Direct answer

At Homie's current 1080p production path, the raw Higgsfield cost is approximately $4.41 for a 10-second one-shot video, $8.82–$10.58 for an 18-second multi-shot video, and $13.23 for a 30-second premium video. With a 20% retry reserve, use $5.29, $10.58–$12.70, and $15.88 respectively.

R2 is economically negligible: a 30–100 MB final costs approximately $0.00045–$0.0015 per stored month before the free tier. At 1,000 retained 60 MB videos, storage is about $0.75/month after the 10 GB free tier.

The current Homie plans ($29/3, $59/10, $149/30) lose money at full utilization under the current 1080p mix. Using the simple average of the 10 active production templates ($13.12 per finished video after retry reserve), approximate contribution after Polar and 15% marketing is -$16.67, -$84.54, and -$275.02 per subscriber-month respectively.

Recommended commercial model:

1. Default standard tours to Seedance 2.0 Mini at 720p and make 1080p/30-second cinematic generation a premium add-on.
2. Price standard plans around $49 for 3, $129 for 10, and $349 for 30 standard tours.
3. Charge a 30-second premium generation as five standard units or a $39 add-on.
4. If Homie keeps the current 1080p generation path for every included video, use approximately $79 for 3, $249 for 10, and $749 for 30 instead.

## Production findings

- Production currently has 10 active templates.
- The 18-second templates generate either four 5-second clips (20 billed seconds) or six 4-second clips (24 billed seconds), even though the final output is trimmed to 18 seconds.
- The queue function currently overwrites the selected recipe with `seedance_2_0`; therefore, the two 30-second templates configured for Seedance 2.5 can be sent to a model whose per-job maximum is 15 seconds. This is both a reliability bug and a pricing-data integrity issue.
- Active template allowance costs are inconsistent: most cost 1 internal unit, while five newer 30-second templates cost 60 or 100 units. Plans only grant 1, 3, 10, or 30 units, making those templates inaccessible through normal allowances.

## Cost calculations

Higgsfield live credit quotes:

- Seedance 2.0 Mini 720p: 2.5 credits/second.
- Seedance 2.0 720p: 4.5 credits/second.
- Seedance 2.0 1080p: 9 credits/second.
- Seedance 2.5 720p: 6.5 credits/second.
- Seedance 2.5 1080p: 9 credits/second.

At $0.049/credit:

| Homie output | Billed generation | Credits | Raw cost | +20% retry reserve |
|---|---:|---:|---:|---:|
| Quick 10s, Seedance 2.0 1080p | 10s | 90 | $4.41 | $5.29 |
| Tour 18s, four shots | 20s | 180 | $8.82 | $10.58 |
| Tour 18s, six shots | 24s | 216 | $10.58 | $12.70 |
| Premium 30s, Seedance 2.5 1080p | 30s | 270 | $13.23 | $15.88 |

## Limitations

- Higgsfield uses subscription credits rather than a published contractual wholesale API rate. Enterprise/API pricing could materially improve the model.
- The 20% retry reserve is not measured production failure data.
- Marketing as a percentage of revenue is a budgeting proxy, not a CAC model. Once Homie has paid-channel data, replace it with CAC divided by expected paid lifetime and track CAC payback.
- Competitors often use simple photo motion/editing rather than full generative video, so their lower per-listing prices are not directly comparable.

## Recommendations

- Meter by compute class, not by a flat “one generation” unit.
- Log provider credits and retries per project, then calculate cost per approved final video by template.
- Fix the queue-time model override and the 60/100-unit template inconsistencies before exposing all plans.
- Seek Higgsfield enterprise/API volume pricing before scaling paid acquisition.

## Claim-to-source ledger

- Higgsfield plan reference and model cost context: https://higgsfield.ai/blog/seedance-2-5-pricing-2026 and https://higgsfield.ai/blog/seedance-2-0-pricing-2026
- Higgsfield live cost quotes and account plan: authenticated Higgsfield CLI v1.1.22, `higgsfield generate cost` and `higgsfield account status`, checked 2026-09-06.
- R2 rates/free tier/egress: https://developers.cloudflare.com/r2/pricing/
- Polar fees: https://polar.sh/resources/pricing
- Marketing benchmark: https://www.saas-capital.com/blog-posts/spending-benchmarks-for-private-b2b-saas-companies/
- Market sanity checks: https://www.reel-e.ai/pricing and https://www.diane.estate/pricing
- Homie production configuration: local `scripts/video-worker.mjs`, Supabase migrations, and read-only production queries to active `plans` and `video_templates`, checked 2026-09-06.
