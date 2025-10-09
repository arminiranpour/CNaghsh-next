# Performance & CWV Playbook

## Revalidation strategy
- `/profiles` and `/jobs` directory pages revalidate every 60 seconds for fresh yet cacheable listings.
- `/profiles/[id]` and `/jobs/[id]` detail pages revalidate every 300 seconds to balance freshness with CDN reuse.
- Global SEO surfaces (`/sitemap.xml`, `/sitemap-static`, `/profiles/sitemap.xml`, `/jobs/sitemap.xml`, `/robots.txt`) revalidate every 86,400 seconds (24h) for predictable crawls.

## Asset caching
- Long-lived immutable caching headers (`public, max-age=31536000, immutable`) are returned for `/_next/static/*`, `/assets/*`, `/logo.svg`, and `/favicon.ico` via `next.config.mjs`.
- Image optimization prefers AVIF/WebP formats and enables HTTP compression by default.

## Orchestrator cache bypass
- Data orchestrators respect the `ORCH_BYPASS_CACHE=1` flag (non-production only) to bypass `unstable_cache` while still logging execution timings.
- Use when you need to validate fresh database reads without invalidating ISR.

## Slow query logging
- Enable verbose Prisma timing with `PRISMA_SLOW_LOG=1` (non-production). Queries taking ≥200 ms emit `[perf:db] slow_query` logs with SQL and elapsed time.

## Scripts & smoke tests
- `pnpm -F @app/web run perf:baseline` — Runs Lighthouse against `/profiles` and `/jobs`, printing Performance, LCP, and CLS scores.
- `pnpm -F @app/web run cwv:smoke` — Fetches CWV-critical routes and reports `cache-control`, `age`, and `x-cache` headers to validate ISR/CDN behaviour.

## Verification checklist
1. Start the app: `pnpm -w dev`
2. Lighthouse baseline: `pnpm -F @app/web run perf:baseline`
3. Cache headers quick check: `curl -sI http://localhost:3000/logo.svg | grep -iE 'cache-control|etag|last-modified'`
4. Orchestrator cache bypass smoke: `ORCH_BYPASS_CACHE=1 pnpm -F @app/web run search:smoke`
5. CWV header smoke: `pnpm -F @app/web run cwv:smoke`
6. Slow DB logging: `PRISMA_SLOW_LOG=1 pnpm -w dev` (trigger a few searches in another terminal)

Keep this checklist handy when validating performance regressions or preparing releases.
