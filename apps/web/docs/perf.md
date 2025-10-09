# Performance & CWV Playbook

This document outlines how we harden caching, surface slow queries, and verify Core Web Vitals (CWV) for `/profiles` and `/jobs`.

## Revalidation strategy

- **List pages** (`/profiles`, `/jobs`) use `revalidate = 60`. They stay fresh for fast-moving search results while still benefiting from a 60s ISR/CDN cache window.
- **Detail pages** (`/profiles/[id]`, `/jobs/[id]`) revalidate every 5 minutes (`revalidate = 300`) to balance freshness with reduced re-render churn.
- **Sitemaps & robots** (`/profiles/sitemap.ts`, `/jobs/sitemap.ts`, `/sitemap-static.ts`, `/sitemap.ts`, `robots.ts`) revalidate daily (`revalidate = 86400`) because the payload changes infrequently and can stay cached longer.

## Static asset caching

Long-lived browser/CDN headers are defined in `next.config.mjs` for:

- `/_next/static/*`
- `/assets/*`
- `/logo.svg`
- `/favicon.ico`

They ship with `Cache-Control: public, max-age=31536000, immutable` so repeat visits load instantly from cache.

## Orchestrator cache bypass

All search orchestrators honour `ORCH_BYPASS_CACHE=1`. Set the environment variable to disable `unstable_cache` locally while still logging query timings:

```bash
ORCH_BYPASS_CACHE=1 pnpm -F @app/web run search:smoke
```

## Slow query logging

Enable the Prisma slow-query logger outside production with `PRISMA_SLOW_LOG=1`. Queries slower than 200 ms print a `[perf:db] slow_query` entry with context.

```bash
PRISMA_SLOW_LOG=1 pnpm -w dev
```

## Perf verification commands

1. Start the app (required before running the scripts):
   ```bash
   pnpm -w dev
   ```
2. Lighthouse smoke for CWV baselines:
   ```bash
   pnpm -F @app/web run perf:baseline
   ```
3. Inspect CDN/ISR headers quickly:
   ```bash
   curl -sI http://localhost:3000/logo.svg | grep -iE 'cache-control|etag|last-modified'
   ```
4. Verify orchestrator cache bypass behaviour:
   ```bash
   ORCH_BYPASS_CACHE=1 pnpm -F @app/web run search:smoke
   ```
5. Run the CWV cache smoke to confirm response headers:
   ```bash
   pnpm -F @app/web run cwv:smoke
   ```
6. Surface slow DB traces (in a second terminal while you run searches):
   ```bash
   PRISMA_SLOW_LOG=1 pnpm -w dev
   ```
