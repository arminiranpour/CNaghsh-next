# Billing Sandbox

## Start checkout
```
curl -X POST http://localhost:3000/api/checkout/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"<USER_ID>","provider":"zarinpal","priceId":"<PRICE_ID>"}'
```

## Simulate webhooks
Replace `<SECRET>` with `WEBHOOK_SHARED_SECRET` (omit header in dev without the secret).

### Zarinpal
Success:
```
curl -X POST http://localhost:3000/api/webhooks/zarinpal \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <SECRET>" \
  -d '{"sessionId":"<SESSION_ID>","providerRef":"sandbox-zarinpal","status":"OK"}'
```
Failure:
```
curl -X POST http://localhost:3000/api/webhooks/zarinpal \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <SECRET>" \
  -d '{"sessionId":"<SESSION_ID>","providerRef":"sandbox-zarinpal","status":"FAILED"}'
```

### IDPay
Success:
```
curl -X POST http://localhost:3000/api/webhooks/idpay \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <SECRET>" \
  -d '{"sessionId":"<SESSION_ID>","providerRef":"sandbox-idpay","status":"OK"}'
```
Failure:
```
curl -X POST http://localhost:3000/api/webhooks/idpay \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <SECRET>" \
  -d '{"sessionId":"<SESSION_ID>","providerRef":"sandbox-idpay","status":"FAILED"}'
```

### NextPay
Success:
```
curl -X POST http://localhost:3000/api/webhooks/nextpay \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <SECRET>" \
  -d '{"sessionId":"<SESSION_ID>","providerRef":"sandbox-nextpay","status":"OK"}'
```
Failure:
```
curl -X POST http://localhost:3000/api/webhooks/nextpay \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <SECRET>" \
  -d '{"sessionId":"<SESSION_ID>","providerRef":"sandbox-nextpay","status":"FAILED"}'
```

## Successful payment result
A successful webhook marks `Payment.status=PAID`, `Invoice.status=PAID`, and `CheckoutSession.status=SUCCESS` for the session.

## Verify entitlements
1. Run a checkout with a subscription price and wait for the webhook success. Then query the QA endpoint to confirm the profile publish entitlement was extended by the correct cycle:
   ```
   curl "http://localhost:3000/api/billing/entitlements?userId=<USER_ID>"
   ```
   The `can_publish_profile.expiresAt` timestamp should be in the future and match the plan cycle duration (monthly = +1 month, quarterly = +3 months, yearly = +12 months).
2. Run a checkout with a one-time job price and trigger the webhook success. Hitting the same endpoint should show `job_post_credit.remainingCredits` incremented by 1.
3. Re-send the same webhook payload (same `providerRef`). The entitlement values remain unchanged, demonstrating idempotency.

## Public Pages

### `/pricing`

The public pricing screen lists all active subscription plans and one-time job post prices directly from the database. Amounts are formatted in ریال with Persian digits. Before starting a checkout, provide a sandbox user ID:

- Pass `?userId=<ID>` in the URL **or**
- Enter an ID in the inline "شناسه کاربر" field. The value is saved to `localStorage` (`sandboxUserId`) for subsequent visits.

Selecting «خرید اشتراک» یا «پرداخت برای آگهی» opens a provider picker (زرین‌پال / آیدی‌پی / نکست‌پی). After confirming, `/api/checkout/start` is called and the app navigates to `/checkout/<sessionId>` while also forwarding the browser to the provider sandbox URL.

### `/checkout/[sessionId]`

This page polls `/api/checkout/<sessionId>` without caching and renders:

- **STARTED/PENDING** – shows a loading state, auto-redirects to the provider, and exposes a fallback «رفتن به درگاه» link.
- **SUCCESS** – confirms payment, links back to `/pricing`, and offers a QA shortcut to `/api/billing/entitlements?userId=<id>`.
- **FAILED** – displays an error card with a «تلاش مجدد» button.
- Unknown sessions or server errors show inline messages rather than throwing.

### `/billing/sandbox-redirect`

The sandbox page mirrors the provider return flow. Query parameters (`session`, `provider`, `amount`, `currency`, `returnUrl`) are echoed in a summary card. Two actions send webhook payloads to `/api/webhooks/<provider>`:

- «تأیید پرداخت (موفق)» submits `{ status: "OK" }`.
- «پرداخت ناموفق» submits `{ status: "FAILED" }`.

If `WEBHOOK_SHARED_SECRET` is configured, add the signature in the inline field (persisted in `localStorage` as `sandboxWebhookSignature`) to include the `X-Webhook-Signature` header. After each webhook, the page returns to `returnUrl` if present, otherwise it navigates to `/checkout/<sessionId>` for verification.