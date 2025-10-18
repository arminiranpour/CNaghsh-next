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
