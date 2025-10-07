# Rendering Strategy (Phase 1)

| Route | Strategy | Revalidate | Rationale |
| --- | --- | --- | --- |
| `/profiles` | SSR | n/a | Directory needs fresh filters and crawlable markup tied to canonical URLs. |
| `/jobs` | SSR | n/a | Job listings should reflect latest openings for search engines and logged-out visitors. |
| `/profiles/[id]` | ISR | 60–120s | Detail pages can tolerate brief staleness while benefitting from cache for traffic spikes. |
| `/jobs/[id]` | ISR | 60–120s | Individual job posts refresh periodically; ISR balances freshness with stability. |

> **Note:** Listing pages use SSR in Phase 1 while individual detail pages remain ISR to keep regeneration predictable until dynamic authoring workflows are finalized.
