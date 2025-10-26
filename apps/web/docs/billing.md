# Billing

## Phase 1 — Data Model
- **User ↔ Subscription ↔ Plan**: each user has at most one current `Subscription` row linked to a `Plan`, capturing lifecycle dates (`startedAt`, `endsAt`, `renewalAt`) and the `SubscriptionStatus` state machine (`active`, `renewing`, `canceled`, `expired`).
- **Payment ↔ Invoice**: every `Invoice` belongs to a `Payment`, exposes a globally unique `number`, tracks the billing `type` (`SALE` or `REFUND`), optional `providerRef`, and timestamped `issuedAt` for chronological sorting.
- **Webhook Logs**: `PaymentWebhookLog` captures raw provider payloads, can optionally reference a `Payment`, and enforces idempotency via `@@unique([provider, externalId])` so duplicate events are ignored safely.
- **Entitlements**: `UserEntitlement` retains a historical trail per key. Database uniqueness on `(userId, key, expiresAt)` plus application checks ensure there is only one active `CAN_PUBLISH_PROFILE` entitlement for a user at any time.
- **Idempotency Guarantees**: the unique subscription per user (`@@unique([userId])`) and webhook log constraint prevent duplicate lifecycle rows and webhook reprocessing.

These structures prepare the billing system for lifecycle automation while remaining backward compatible with existing seed data.

## Phase 2 — Webhooks
- Webhook payloads log into `PaymentWebhookLog` with statuses `received`, `handled`, or `invalid`. Idempotency relies on the `@@unique([provider, externalId])` constraint.
- Provider-specific helpers normalize payloads to internal statuses (`PAID`, `FAILED`, `PENDING`, `REFUNDED`) and resolve identifiers before delegating to the shared service.
- Use `pnpm --filter @app/web run qa:sprint --only=billing:webhooks` with `WEBHOOK_TEST_SECRET` to drive the simulator harness. The admin simulator expects `webhook-test-secret` and `x-admin-user-id` headers.
- A successful `PAID` webhook creates or reuses the `Payment` and generates an `Invoice` once; replays short-circuit with `{ idempotent: true }`.

## Phase 3 — Lifecycle Orchestration
- `subscriptionService` owns lifecycle transitions: `activateOrStart`, `renew`, `setCancelAtPeriodEnd`, `markExpired`, and `getSubscription` always run inside Prisma transactions.
- State transitions:
  - Activation or restart → status `active`, resets `cancelAtPeriodEnd` and schedules `renewalAt`.
  - Renewals extend from the later of `now` or the previous `endsAt` (anchor rule).
  - Cancel at period end toggles `cancelAtPeriodEnd` and flips status to `renewing` when opting out.
  - Mark expired preserves `endsAt` and records status `expired`.
- Renewal anchor rule: `anchor = max(now, endsAt)` ensures time is never shortened.
- Domain events emitted: `SUBSCRIPTION_ACTIVATED`, `SUBSCRIPTION_RESTARTED`, `SUBSCRIPTION_RENEWED`, `SUBSCRIPTION_EXPIRED`, `SUBSCRIPTION_CANCEL_AT_PERIOD_END_SET`, `SUBSCRIPTION_CANCEL_AT_PERIOD_END_CLEARED`.

## Phase 4 — Entitlement Sync
- `syncAllSubscriptions(now?)` runs the reconciliation pipeline. Steps:
  - Mark any subscription with `endsAt < now` as `expired` (without mutating `endsAt`).
  - Load all users with a subscription or a `CAN_PUBLISH_PROFILE` entitlement and reconcile each inside a Prisma transaction.
  - Active subscriptions guarantee one active entitlement whose `expiresAt` mirrors the subscription `endsAt`; stale rows are updated instead of duplicated.
  - Expired or canceled subscriptions clamp the entitlement by setting `expiresAt = now` and trigger `autoUnpublishIfNoEntitlement` to flip the profile to `PRIVATE`/`publishedAt = NULL` when needed.
- **Cron trigger**: POST `/api/internal/cron/subscriptions` with `X-CRON-SECRET = process.env.CRON_SECRET`. Calls `syncAllSubscriptions` and returns `{ ok: true, usersChecked, expiredMarked, entitlementsGranted, entitlementsRevoked, profilesUnpublished }`. Invocations within one minute are rate-limited and respond with `rateLimited: true` plus zeroed counters.
- **Manual script**: `pnpm --filter @app/web tsx scripts/check-subscriptions.ts` prints the same summary JSON and writes it to `reports/sprint-verification/<timestamp>/billing-entitlements.json`.
- **Invariants**:
  - At most one active `CAN_PUBLISH_PROFILE` entitlement per user.
  - `expiresAt` always tracks the subscription `endsAt` for active subscriptions.
  - When entitlements lapse, profiles are automatically unpublished.
- **Harness**: `pnpm --filter @app/web run qa:sprint --only=billing:entitlements` provisions fixtures, runs the manual script twice (active → expired), asserts counter deltas, entitlement expiry, and profile visibility, then records a consolidated report under `reports/sprint-verification/<timestamp>/billing-entitlements.json`.

## Phase 5 — Admin Dashboard
- **Paths**: `/admin/billing` provides overview metrics and tab navigation across `/admin/billing/subscriptions`, `/admin/billing/payments`, and `/admin/billing/invoices`.
- **Filters**: each tab offers search, provider/status selections, plan or type filters, and date range pickers with server-side pagination to keep data responsive.
- **Row actions**:
  - Subscriptions expose “لغو فوری” to expire immediately via the lifecycle service and trigger entitlement sync.
  - Payments expose “بازگشت” (stub refund) that marks the payment `REFUNDED`, creates a negative `Invoice` (`type = REFUND`, `total = -amount`), and expires active subscriptions for full refunds.
  - Entitlement controls allow granting or revoking `CAN_PUBLISH_PROFILE` with required reasoning; grants accept an optional expiry date to stage access.
- **CSV export**: the invoices tab streams `number,userEmail,type,total,currency,issuedAt,status,providerRef` for downstream reconciliation.
- **Refund policy**: admin-triggered refunds immediately revoke publication entitlements by expiring the subscriber’s period and re-running the sync helper.
- **QA harness**: `pnpm --filter @app/web run qa:sprint --only=billing:admin` seeds a dedicated user, executes cancel → refund → grant → revoke flows via the admin APIs, exports CSV, and writes `reports/sprint-verification/<timestamp>/billing-admin.json` on success.

### Local QA Access
- یک شناسه مدیر را با اجرای دستور زیر به‌دست آورید:
  - `pnpm --filter @app/web tsx -e "import {prisma} from './lib/prisma';(async()=>{const u=await prisma.user.findFirst({where:{role:'ADMIN'},select:{id:true}});console.log(u?.id||'NO_ADMIN');process.exit(0)})()"`
- برای دور زدن احراز هویت در محیط توسعه، مقدار کوکی `ADMIN_USER_ID` را روی آن شناسه قرار دهید یا درخواست‌ها را با هدر `x-admin-user-id` ارسال کنید.
- در صورت فعال بودن متغیر محیطی `DEV_ADMIN_BYPASS=true`، میان‌افزار برنامه به‌صورت خودکار مقدار کوکی را به هدر تبدیل می‌کند تا مرورگر محلی بدون ابزار اضافی دسترسی مدیر را دریافت کند.
