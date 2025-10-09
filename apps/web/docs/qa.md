# QA Checklist

## Sprint verification harness

Run all automated SEO, caching, CWV, rollout, analytics, and unit checks in one pass:

```bash
pnpm --filter @app/web run qa:sprint
```

The harness verifies the dev server is healthy, streams command output to the console, and
writes logs/`summary.json` to `reports/sprint-verification/<timestamp>`. Use `--list` to inspect
available task IDs, `--only=task-id,another` to run a subset, or `--skip-server-check` if the
server health probe should be bypassed (e.g. targeting a remote URL via `NEXT_PUBLIC_APP_URL`).

Manual follow-ups still required after the automated run:

- [ ] Job detail view counter issues a successful `POST /api/jobs/<id>/views` without UI errors.
- [ ] With `PRISMA_SLOW_LOG=1 pnpm -w dev`, slow query logs emit `[perf:db] slow_query` entries.
- [ ] `NEXT_PUBLIC_ENV=staging` renders `<meta name="robots" content="noindex, nofollow">`.
- [ ] Sentry stays disabled without DSN/flag and initializes when `SENTRY_DSN` + `NEXT_PUBLIC_FLAGS=sentry` are provided.

## Functional smoke tests

- [ ] `/profiles` loads with SSR/ISR headers (`Cache-Control`, `age`, `x-nextjs-cache`).
- [ ] `/profiles` filters update results and pagination retains query params.
- [ ] `/jobs` loads with SSR/ISR headers (`Cache-Control`, `age`, `x-nextjs-cache`).
- [ ] `/jobs` search, filters, and pagination behave as expected.
- [ ] Profile detail pages render JSON-LD payload.
- [ ] Job detail pages render JSON-LD payload.
- [ ] `/sitemap.xml` is reachable and lists job/profile URLs.
- [ ] `/robots.txt` reflects the target environment (noindex on staging).
- [ ] Consent banner only fires analytics after opt-in; no events emitted beforehand.
- [ ] Sentry disabled when `SENTRY_DSN` is empty; initializes when DSN + `sentry` flag enabled.

## Release checklist

- [ ] Staging environment serves `noindex, nofollow` robots meta.
- [ ] Flags configured: `analytics` on, `canary` enabled for 10% via infrastructure, `sentry` on with DSN.
- [ ] Canary bake 30–60 minutes with Sentry noise, error rate, and page load metrics monitored.
- [ ] Promote by flipping `NEXT_PUBLIC_ENV=production`, removing `noindex`, widening canary, then 100% rollout.
