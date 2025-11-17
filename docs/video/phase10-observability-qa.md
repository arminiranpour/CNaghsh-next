# Phase 10 – Observability, Alerts, and Release QA

## Pre-release Smoke Tests
Run these after deploying the latest build (all must exit `0`):

```
pnpm --filter @app/web cwv:smoke
pnpm --filter @app/web cwv:budgets
pnpm --filter @app/web media:cdn-url-check
pnpm --filter @app/web media:alert-check
pnpm --filter apps/worker health
```

If any command fails, investigate and rerun after fixing the issue before rolling out.

## Manual QA
1. Upload a new video via the dashboard upload UI.
2. Wait for processing to finish, then confirm playback on:
   - The profile page for the uploader.
   - The job page (if that media is attached to a job).
3. Visit `/admin/media`:
   - Ensure the new upload appears with the correct processing status and moderation state.
   - Exercise requeue/visibility actions to confirm they still work.
4. Force at least one failed transcode (e.g., upload an invalid file) so alerting surfaces non-happy-path cases.

## Monitoring & Alerting
- **Health snapshot**: call `/api/admin/media/health` (or run `pnpm --filter @app/web media:health-check`) to inspect queue depth, DB counts, and the 10 most recent failures.
- **Queue backlog / failures**: run `pnpm --filter @app/web media:alert-check` locally or via cron/CI. It emits `ALERT media.pipeline ...` and exits non-zero when backlog or failures exceed thresholds; otherwise prints an `OK` line.
- **Worker readiness**: `pnpm --filter apps/worker health` pings Redis, the Bull queue, and the database. Non-zero exit codes mean the worker infrastructure needs attention before shipping.
- **Logs**: all upload API calls, manifest/status lookups, worker lifecycle events, and queue notifications emit structured JSON log lines (`service`, `event`, `level`, `timestamp`, `fields`). Forward stdout/stderr from web + worker containers to your log store for search and alert automation.

## On-call Playbook
1. When `media:alert-check` or another monitor fires, first run `pnpm --filter apps/worker health` to confirm Redis/DB/queue connectivity.
2. Fetch `/api/admin/media/health` (or use the admin UI health header) to see queue depth, backlog, and recent failures. Large `waiting` or `failed` counts indicate backlog; `recentFailures` provide media IDs for debugging.
3. Review `/admin/media` to inspect the affected assets, read `errorMessage`, and requeue if needed.
4. Tail structured logs from the upload API and worker to correlate job IDs, errors, and queue events. Capture stack traces via Sentry for unexpected worker/upload exceptions.
5. After remediation, rerun the smoke scripts above to confirm the pipeline is back to green before closing the incident.
