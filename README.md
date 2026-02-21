# CNaghsh Next

CNaghsh is a full-stack casting and jobs platform built with Next.js. It combines public, SEO-friendly
listings with authenticated dashboards, admin moderation workflows, and a production-grade billing
system tailored for local payment gateways and IRR pricing.

This repository is organized as a pnpm + Turbo monorepo with a primary Next.js app in `apps/web` and
shared tooling in `packages` and `tools`.

## What it does

- Public profiles and job listings with structured data (JSON-LD), sitemaps, and cache-aware SSR/ISR.
- Profile publishing controls tied to subscription entitlements.
- Admin moderation flows for jobs (approve, reject, suspend, feature).
- Subscription and one-time purchases with webhook-driven payments, idempotency safeguards, and invoicing.
- In-app and email notifications orchestrated through a queue.
- Billing admin UI for products, plans, and prices.

## How it is implemented

- Next.js App Router in `apps/web` with React 19 and NextAuth-based authentication.
- Prisma + PostgreSQL data layer with strongly typed models, migrations, and transactional services.
- Background processing using BullMQ + Redis for notifications and scheduled jobs.
- File/media storage via S3-compatible APIs with signed URLs.
- Tailwind CSS with RTL support and Persian typography.
- Performance and SEO tooling with Lighthouse baselines, smoke tests, and Vitest coverage.

## Tech stack

- Next.js 15 (canary), React 19, TypeScript
- Prisma, PostgreSQL
- Tailwind CSS, Radix UI
- NextAuth, Zod
- BullMQ, Redis
- Sentry, Vitest, Playwright

## Repo layout

- `apps/web` – Next.js app, API routes, Prisma schema, scripts
- `packages` – shared packages and contracts
- `infra` – local development infrastructure
- `tools` – QA and build utilities

## Local development

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @app/web prisma migrate dev
pnpm --filter @app/web db:seed
pnpm --filter @app/web dev
```

## Quality checks

```bash
pnpm --filter @app/web lint
pnpm --filter @app/web typecheck
pnpm --filter @app/web test --coverage
```

For deeper implementation notes and runbooks, see `apps/web/docs`.
