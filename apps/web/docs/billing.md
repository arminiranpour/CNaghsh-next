# Billing

## Phase 1 — Data Model
- **User ↔ Subscription ↔ Plan**: each user has at most one current `Subscription` row linked to a `Plan`, capturing lifecycle dates (`startedAt`, `endsAt`, `renewalAt`) and the `SubscriptionStatus` state machine (`active`, `renewing`, `canceled`, `expired`).
- **Payment ↔ Invoice**: every `Invoice` belongs to a `Payment`, exposes a globally unique `number`, tracks the billing `type` (`SALE` or `REFUND`), optional `providerRef`, and timestamped `issuedAt` for chronological sorting.
- **Webhook Logs**: `PaymentWebhookLog` captures raw provider payloads, can optionally reference a `Payment`, and enforces idempotency via `@@unique([provider, externalId])` so duplicate events are ignored safely.
- **Entitlements**: `UserEntitlement` retains a historical trail per key. Database uniqueness on `(userId, key, expiresAt)` plus application checks ensure there is only one active `CAN_PUBLISH_PROFILE` entitlement for a user at any time.
- **Idempotency Guarantees**: the unique subscription per user (`@@unique([userId])`) and webhook log constraint prevent duplicate lifecycle rows and webhook reprocessing.

These structures prepare the billing system for lifecycle automation while remaining backward compatible with existing seed data.
