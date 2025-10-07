# Jobs Moderation & Release Handbook

This handbook captures the operational details for the Jobs public listing, admin moderation flows,
notification fan-out, caching strategy, and security posture introduced in Sprint 4.

## Admin moderation guide

### Access control

- `/admin/jobs` and `/admin/jobs/[id]` are server components gated by `getServerAuthSession`. Only
  users with `role === "ADMIN"` reach the page; others trigger `notFound()`.
- Every server action re-fetches the session to enforce defense-in-depth. Tests under
  `app/(admin)/admin/jobs/actions.test.ts` assert that anonymous and non-admin callers receive a
  denial response.

### Actions & limits

| Action | Allowed from | Result | Notes |
| --- | --- | --- | --- |
| Approve | Pending / Rejected / Suspended | Sets `moderation=APPROVED` | Emits `MODERATION_APPROVED` notification and revalidates list/detail caches. |
| Reject | Pending / Approved / Suspended | Sets `moderation=REJECTED` | Optional note trimmed to 500 chars. Sends `MODERATION_REJECTED`. |
| Suspend | Pending / Approved / Rejected | Sets `moderation=SUSPENDED` | Optional note stored; notification uses action=`SUSPENDED`. |
| Feature | Approved jobs | Updates `featuredUntil` | Preset (7/14/30 days) or custom date capped at 60 days. Extends from existing feature when still active. |
| Clear feature | Featured jobs | Sets `featuredUntil=null` | Emits `MODERATION_PENDING` with action=`UNFEATURED`. |
| Close | Any status except `CLOSED` | Sets `status=CLOSED` | Stops public visibility and triggers `MODERATION_PENDING` with action=`CLOSED`. |

Additional rules:

- Custom feature requests normalize to 23:59:59 of the selected day and reject past dates or
  schedules beyond 60 days.
- Feature/unfeature commands are rate limited to **5 operations per minute per admin**. Surplus
  requests return a localized error advising the admin to retry later. The limiter is tested to ensure
  it resets after the window.
- Every moderation change writes a `jobModerationEvent` row containing the admin id, action, and
  optional note to maintain an auditable history.
- Actions call `revalidateJobRelatedPaths` which revalidates all relevant cache tags plus the author
  dashboard view.

## Notifications reference

All job-related notifications fan out through `notifyOnce`, which deduplicates events by user, type,
body/payload hash within a 10 minute window and records dispatch instrumentation.

| Scenario | Event helper | NotificationType | Channels | Dedupe key |
| --- | --- | --- | --- | --- |
| Approve | `emitJobApproved` | `MODERATION_APPROVED` | In-app | `MODERATION_APPROVED:job:<jobId>:<jobStatus>` |
| Reject | `emitJobRejected` | `MODERATION_REJECTED` | In-app | `MODERATION_REJECTED:job:<jobId>:<note>` |
| Suspend | `emitJobPending` (`action="SUSPENDED"`) | `MODERATION_PENDING` | In-app | `MODERATION_PENDING:job:<jobId>:SUSPENDED:<note>` |
| Pending (manual revert) | `emitJobPending` (`action="PENDING"`) | `MODERATION_PENDING` | In-app | `MODERATION_PENDING:job:<jobId>:PENDING:<note>` |
| Feature | `emitJobFeatured` | `MODERATION_PENDING` | In-app | `MODERATION_PENDING:job:<jobId>:FEATURED:<iso>` |
| Unfeature | `emitJobUnfeatured` | `MODERATION_PENDING` | In-app | `MODERATION_PENDING:job:<jobId>:UNFEATURED` |
| Close | `emitJobClosed` | `MODERATION_PENDING` | In-app | `MODERATION_PENDING:job:<jobId>:CLOSED` |

Email delivery is optional. `notifyOnce` automatically adds the e-mail channel when
`isEmailConfigured()` returns `true`. Otherwise only in-app notifications are persisted. Each dispatch
emits an instrumentation event for observability; tests validate both dedupe and observer hooks.

## Caching & revalidation

### Tag taxonomy

| Tag | Description |
| --- | --- |
| `cities` | Location cache for dropdowns. |
| `jobs:filters` | Distinct category & pay-type filters. |
| `jobs:list` | Base public listing. |
| `jobs:list:city:<cityId>` | City-specific listing facet. |
| `jobs:list:category:<category>` | Category facet. |
| `jobs:list:remote:<0/1>` | Remote filter facet. |
| `jobs:list:payType:<type>` | Pay-type facet. |
| `jobs:list:sort:<sort>` | Sort option facet (`newest`, `featured`, `expiring`). |
| `job:<id>` | Individual job detail. |
| `job:<id>:views` | Debounced view counter. |

`getPublicJobs`, `getPublicJobById`, and `getPublicJobFilters` use `unstable_cache` with the above
facets and TTLs (`CACHE_REVALIDATE`). Admin actions call `revalidateJobRelatedPaths(jobId)` which:

1. Fetches the job to gather all applicable tags (city/category/payType/remote + sort tags).
2. Revalidates each tag plus the filters aggregate via `revalidateTag`.
3. Revalidates `/dashboard/jobs` to refresh author/admin dashboards.

Tests in `lib/jobs/publicQueries.test.ts` and `lib/jobs/revalidate.test.ts` cover the tag selection and
revalidation behavior to prevent regressions.

## Security notes

- **Authorization** – Page-level guards plus server-action checks ensure only admins can moderate
  jobs. Non-admins trigger `notFound()` and receive localized error responses.
- **Validation** – All inputs pass through Zod schemas (`cuid` ids, preset/custom feature commands,
  optional notes capped at 500 characters). Invalid data surfaces localized errors to the UI.
- **Sanitized rendering** – Public job pages render plain text descriptions with `whitespace-pre-line`;
  admin-only fields and notes never leak into public responses. JSON-LD remains sanitized through the
  existing SEO helpers.
- **Rate limiting** – Feature commands are throttled; job view increments use an httpOnly cookie with a
  30-minute debounce window (tests verify the cookie guard).
- **Secrets** – No secrets are checked into the repo. Email delivery is optional; in-app notifications
  function regardless of SMTP configuration.

## Release notes & post-merge checklist

### Versioning

- Bump `@app/web` version to `0.1.0` for the Jobs release.
- Tag the repository as `jobs-sprint4` (example) after merging and use the changelog below in the
  release description.

### Changelog highlights

- Added admin jobs moderation dashboard with approve/reject/suspend/feature/close actions.
- Implemented public `/jobs` listing filters, pagination, and JSON-LD metadata.
- Added notification fan-out for all moderation outcomes with dedupe + instrumentation.
- Implemented cache tag taxonomy with tag-based revalidation after admin changes.
- Added rate limiting to feature/unfeature commands and coverage-gated automated tests.

### Post-merge verification

1. Run CI: `pnpm --filter @app/web lint`, `typecheck`, `test --coverage`, and `next build`.
2. Deploy to staging and smoke test:
   - `/jobs` lists only `PUBLISHED` + `APPROVED` jobs; JSON-LD present.
   - Approve a pending job in `/admin/jobs` → listing reflects change without refresh, notification
     appears for the owner.
   - Reject a job with a note → note visible in notification center only.
   - Feature a job (preset + custom) → badge visible until expiration.
   - Close a job → disappears from public lists; owner sees closed status in dashboard.
3. Validate accessibility with automated tooling (Lighthouse or axe) to ensure headings, button text,
   and focus order remain correct on `/jobs` and `/admin/jobs`.
4. Confirm `revalidateTag` instrumentation in logs and that notification dispatch observer captures
   events without errors.

For additional manual test scripts see the billing and job flow checklist in `apps/web/README.md`.
