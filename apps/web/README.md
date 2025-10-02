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