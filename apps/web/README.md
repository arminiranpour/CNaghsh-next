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