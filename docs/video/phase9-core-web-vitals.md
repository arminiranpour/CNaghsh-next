# Phase 9 – Core Web Vitals

## Budgets

| Route            | LCP ≤ | CLS ≤ | INP ≤ |
| ---------------- | ----- | ----- | ----- |
| `/`              | 2500ms | 0.1   | 200ms |
| `/profiles/[id]` | 2500ms | 0.1   | 200ms |
| `/jobs/[id]`     | 2500ms | 0.1   | 200ms |

Budgets live in `apps/web/config/core-web-vitals.budgets.ts` and are consumed by the smoke scripts.

## Commands

```
pnpm --filter @app/web cwv:smoke
pnpm --filter @app/web cwv:budgets
```

`cwv:smoke` launches Lighthouse in mobile mode for each budgeted route, stores per-route JSON under `apps/web/reports/core-web-vitals/routes`, and writes the aggregate summary to `apps/web/reports/core-web-vitals/latest.json`. `cwv:budgets` reuses the latest summary file to enforce budgets without re-running Lighthouse, which is useful in CI after a previous smoke run.

## Interpreting results

- Every smoke run prints a table with `Route | LCP(ms) | CLS | INP(ms) | Status` and logs `[cwv:smoke] <route> failed: ...` when a metric crosses its threshold. The script exits non-zero on failure.
- `cwv:budgets` replays the most recent numbers and fails immediately if any metrics drift above their budgets or if a route is missing data.
- When metrics flirt with thresholds but stay within limits, treat the run as a warning and re-test locally before merging.
- Update or expand budgets only after product approval and when the new target is backed by repeatable measurements.

## Developer checklist

- Keep hero sections server-rendered and reserve explicit space (width/height, aspect ratio) for LCP media.
- Use `next/image` with `priority`, `sizes`, and stable dimensions for any image that can become the LCP.
- Lazy-load or dynamically import heavy client components (media player, analytics widgets, toasts) so the first paint remains lean.
- Ensure video containers enforce an aspect ratio before hydration to avoid CLS when the player mounts.
- Avoid unbounded client components in shared layout/header; isolate interactivity into small islands and keep the rest server-only.
- When changing `/`, `/profiles/[id]`, or `/jobs/[id]`, rerun `pnpm --filter @app/web cwv:smoke` locally and commit refreshed reports if the structure of the page significantly shifts.
