# Billing Sandbox

## Environment variables

The Next.js app relies on `apps/web/lib/env.ts` for typed configuration. Populate `apps/web/.env.local` (or export in your shell):

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string used by Prisma. |
| `PUBLIC_BASE_URL` | ✅ | Absolute origin without a trailing slash (e.g. `http://localhost:3000`). |
| `WEBHOOK_SHARED_SECRET` | ❌ | Optional sandbox secret; omit locally to bypass signature checks. |

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/casting"
PUBLIC_BASE_URL="http://localhost:3000"
# WEBHOOK_SHARED_SECRET="dev_secret"
```

Dynamic API handlers (checkout, webhooks, billing) respond with `Cache-Control: no-store`. The pricing API at `/api/pricing` advertises `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` for shared caching.

## Seed & Manual Testing

### Required commands

All commands assume `pnpm` at the repo root:

```bash
# Apply migrations and refresh the Prisma client
pnpm --filter @app/web prisma migrate dev
pnpm --filter @app/web prisma generate

# Seed billing defaults (idempotent)
pnpm --filter @app/web db:seed

# Start the web app
pnpm --filter @app/web dev

# Create a sandbox user and capture the USER_ID (prints only the id)
pnpm --filter @app/web user:create [optional-email@example.com]
```

### Manual test plan

Pre-flight checklist:

1. `.env.local` contains `DATABASE_URL` and `PUBLIC_BASE_URL` (plus `WEBHOOK_SHARED_SECRET` if you want signature checks).
2. The dev server is running (`pnpm --filter @app/web dev`).
3. Run the seed. Confirm the console output lists both product bundles.
4. Create a user with `pnpm --filter @app/web user:create` and note the returned `USER_ID`.

#### 1. Pricing sanity

1. `curl http://localhost:3000/api/pricing` should return:
   - One subscription plan with `name="ماهانه"`, `cycle="MONTHLY"`, `amount=5000000`, `currency="IRR"`, and formatted `displayAmount="۵٬۰۰۰٬۰۰۰"` from `formatRials`.
   - One job post entry with `amount=1500000` and `currency="IRR"`.
2. Visit `http://localhost:3000/pricing?userId=<USER_ID>` and confirm the UI shows the same ریال values using Persian digits.

#### 2. Subscription flow (success + idempotency)

1. POST to `/api/checkout/start` with `{ "userId": "<USER_ID>", "provider": "zarinpal", "priceId": "<SUB_PRICE_ID>" }`. Expect `sessionId` and `redirectUrl`.
2. Simulate success: POST to `/api/webhooks/zarinpal` with `{ "sessionId": "<SESSION_ID>", "providerRef": "sandbox-zarinpal", "status": "OK" }` (add signature header only if `WEBHOOK_SHARED_SECRET` is set).
3. `curl "http://localhost:3000/api/billing/invoices?userId=<USER_ID>&limit=1"` → latest invoice status is `PAID`, payment status is `PAID`.
4. `curl "http://localhost:3000/api/billing/entitlements?userId=<USER_ID>"` → `can_publish_profile.status === "active"` and `expiresAt` is ~1 month in the future.
5. Re-send the exact same webhook payload. Expect no new invoices/payments and no double extension of the entitlement.

#### 3. Job post flow (success + idempotency)

1. Start another checkout with the job post price. Expect `sessionId` + `redirectUrl`.
2. Send the success webhook for that session.
3. Query `/api/billing/entitlements?userId=<USER_ID>` → `job_post_credit.remainingCredits` increases by 1.
4. Re-send the webhook payload. The credit count must remain unchanged.

#### 4. Dashboard & Admin UI validation

1. `http://localhost:3000/dashboard/billing?userId=<USER_ID>` shows the active subscription entitlement, the job post credit tally, and latest invoices.
2. `http://localhost:3000/admin/billing/products` lists «اشتراک» and «ثبت آگهی شغلی» with active toggles.
3. `http://localhost:3000/admin/billing/plans` shows the single «ماهانه» plan. Toggling `active` hides/shows it on `/pricing` after refresh.
4. `http://localhost:3000/admin/billing/prices` shows both prices. Deactivating/reactivating them should immediately affect `/pricing` results.

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

### `/dashboard/billing`

The dashboard billing screen lives behind the sandbox dashboard shell.

- Visit `/dashboard/billing?userId=<USER_ID>` to preload a sandbox user. If no ID is present you can paste one into the inline tester prompt (stored in `localStorage` as `sandboxUserId`).
- The page summarizes active entitlements (وضعیت انتشار پروفایل + تاریخ انقضا، اعتبار آگهی شغلی + تعداد باقی‌مانده)، فهرست ۱۰ فاکتور اخیر همراه وضعیت و شناسه پرداخت، و دو دکمه برای رفتن به `/pricing` با همان `userId`.
- سریع‌ترین مسیر تست: ابتدا `/dashboard/billing?userId=<id>` را باز کنید تا وضعیت اولیه (غیرفعال / بدون فاکتور) را ببینید. سپس از `/pricing` اشتراک بخرید و وبهوک موفق بزنید؛ پس از رفرش، انتشار پروفایل فعال و فاکتور «PAID» نمایش داده می‌شود. یک خرید تکی آگهی انجام دهید تا اعتبار شغلی +۱ شود و فاکتور جدید اضافه گردد.