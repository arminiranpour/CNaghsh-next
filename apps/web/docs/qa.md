# QA Checklist

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
