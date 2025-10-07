# Web App Setup

This monorepo hosts the Next.js web application (`apps/web`) alongside infrastructure tooling. The
jobs moderation and notification workflows added in Sprint 4 depend on a local PostgreSQL database,
Prisma migrations, and Vitest for automated coverage.

## Quick start

```bash
pnpm install

# Copy environment variables and adjust DATABASE_URL if needed
cp apps/web/.env.example apps/web/.env.local

# Apply Prisma migrations & seed baseline data
pnpm --filter @app/web prisma migrate dev
pnpm --filter @app/web db:seed

# Start the development server
pnpm --filter @app/web dev

# Run quality checks before opening a PR
pnpm --filter @app/web lint
pnpm --filter @app/web typecheck
pnpm --filter @app/web test --coverage
```

`pnpm --filter @app/web test --coverage` enforces the minimum coverage thresholds defined in
`apps/web/vitest.config.ts`. The suite includes unit, integration, and rate-limit regression tests for
the admin server actions, public jobs queries, notifications dispatcher, cache invalidation, and the
view debounce cookie logic.

## Database configuration

The repository now includes `apps/web/.env` with a default development connection string. Update the
value if your local database credentials differ.

> **Why the `schema=public` suffix?** Prisma issues migrations inside the specified schema. Explicitly pinning the schema prevents the CLI from falling back to a restricted default (which previously triggered `P1010` permission errors for the `postgres` user during `pnpm prisma migrate deploy`).

If you prefer to manage environment variables manually, copy `apps/web/.env.example` to
`apps/web/.env.local` (or export the variable in your shell) and adjust the connection string if
needed:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/casting?schema=public"
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
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/casting?schema=public"
PUBLIC_BASE_URL="http://localhost:3000"
# WEBHOOK_SHARED_SECRET="dev_secret"
```

After setting the environment variable you can run the Prisma commands. The workspace `pnpm prisma`
helper now shells through `apps/web/scripts/prisma-cli.ts`, which loads `.env`, `.env.local`, and
`prisma/.env` (in that order) so local overrides flow into every Prisma invocation—including
`pnpm prisma migrate deploy`—using the same connection string that the Next.js app consumes:

```bash
pnpm prisma migrate dev -n init
pnpm prisma generate
```

The helper proxies commands to the `@app/web` package, so Prisma invokes the local
`scripts/prisma-cli.ts` wrapper and inherits the same environment resolution as the Next.js app.

> **macOS Postgres tip:** if you are running Postgres via Homebrew the default socket lives at
> `/tmp/.s.PGSQL.5432`. Ensure your `DATABASE_URL` includes `host=127.0.0.1` to avoid socket
> permission issues (`postgresql://postgres:postgres@127.0.0.1:5432/casting?schema=public`).

### Prisma configuration layout

Previous phases stored Prisma config in `package.json#prisma`. Prisma now recommends co-locating the
CLI options in `prisma/schema.prisma` and using package scripts instead. The existing `package.json`
entry remains for backwards compatibility but will be removed in a future cleanup. Prefer
`pnpm --filter @app/web prisma <command>` to keep tooling consistent.

## Running migrations & rollbacks

To preview or roll back migrations locally:

```bash
# Preview SQL
pnpm --filter @app/web prisma migrate diff --from-empty --to-schema-datamodel

# Revert the last migration (development only)
pnpm --filter @app/web prisma migrate reset
```

Always run the automated test suite after a reset to ensure the Prisma client stays in sync with the
schema.

## Documentation hub

The Sprint 4 jobs work ships with dedicated documentation in `apps/web/docs`:

- `jobs-handbook.md` – admin moderation playbook, notification matrix, caching taxonomy, security
  notes, and release highlights.
- `README.md` (within `apps/web/`) – environment variables, seeding, and manual QA checklists.

Refer to the handbook for post-merge smoke-test steps and the staging verification checklist.

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