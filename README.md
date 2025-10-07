# Web App Setup

This application uses Prisma with a PostgreSQL database connection.

## Database configuration

The repository now includes `apps/web/.env` with a default development connection string. Update the
value if your local database credentials differ.

> **Why the `schema=public` suffix?** Prisma issues migrations inside the specified schema. Explicitly pinning the schema prevents the CLI from falling back to a restricted default (which previously triggered `P1010` permission errors for the `postgres` user during `pnpm prisma migrate deploy`).

If you prefer to manage environment variables manually, copy `apps/web/.env.example` to `apps/web/.env` (or export the variable
in your shell) and adjust the connection string if needed:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/casting?schema=public"
```
## Environment variables

The web application reads configuration through a typed loader in `apps/web/lib/env.ts`. Provide these variables in `apps/web/.env.local` (or your shell):

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string. |
| `PUBLIC_BASE_URL` | ✅ | Absolute origin for building return URLs (no trailing slash, e.g. `http://localhost:3000`). |
| `WEBHOOK_SHARED_SECRET` | ❌ | Shared secret for webhook signature verification. Leave unset to skip signature checks during local development. |

Example `apps/web/.env.local`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/casting?schema=public"
PUBLIC_BASE_URL="http://localhost:3000"
# WEBHOOK_SHARED_SECRET="dev_secret"
```

After setting the environment variable you can run the Prisma commands:

```bash
pnpm prisma migrate dev -n init
pnpm prisma generate
```

Prisma automatically loads `apps/web/.env`, so you only need to define the connection string in that file (or export `DATABASE_URL` in your shell). The top-level `pnpm prisma` script proxies commands to the `@app/web` package, so the CLI picks up the same configuration that Next.js uses.

## Admin Billing CRUD

- مسیرهای مدیریت: `/admin/billing/products`، `/admin/billing/plans` و `/admin/billing/prices` در محیط وب در دسترس هستند.
- قوانین لینک قیمت: قیمت اشتراکی باید به یک پلن متصل شود (planId) و قیمت خرید تکی فقط به محصولی از نوع `JOB_POST` متصل می‌شود. دقیقاً یکی از `planId` یا `productId` باید مقدار داشته باشد.
- تمام مبالغ برحسب ریال (IRR) نگهداری و نمایش داده می‌شوند و ارز قابل تغییر نیست.
- حذف انجام نمی‌شود؛ برای خارج کردن یک قلم از دسترس، وضعیت «فعال» را غیرفعال کنید.

### چک‌لیست تست دستی

1. یک محصول اشتراک (مثلاً «اشتراک») بسازید.
2. زیر آن محصول یک پلن (چرخه ماهانه با `limits = {}`) ایجاد کنید.
3. برای آن پلن یک قیمت با مبلغ ۵٬۰۰۰٬۰۰۰ ریال ثبت کنید.
4. یک محصول `JOB_POST` (مثلاً «ثبت آگهی») بسازید.
5. برای آن محصول قیمت ۱٬۵۰۰٬۰۰۰ ریالی بسازید.
6. صفحه `/pricing` را باز کنید و نمایش صحیح مبالغ ریالی را بررسی کنید.
7. یک قیمت را غیرفعال کنید و مطمئن شوید از صفحه قیمت‌گذاری حذف می‌شود.
8. نام/مبلغ پلن یا قیمت را ویرایش کنید و تأثیر آن را در `/pricing` ببینید.