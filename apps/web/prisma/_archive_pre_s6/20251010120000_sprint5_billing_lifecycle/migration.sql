-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'expired', 'canceled', 'renewing');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SALE', 'REFUND');

-- CreateSequence
CREATE SEQUENCE "Invoice_number_seq" START WITH 1000;

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "renewalAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT,
    "externalId" TEXT NOT NULL,
    "signature" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),
    "status" TEXT,
    "paymentId" TEXT,

    CONSTRAINT "PaymentWebhookLog_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "number" TEXT DEFAULT concat('INV-', to_char(now(), 'YYYYMMDD'), '-', lpad(nextval('"Invoice_number_seq"')::text, 6, '0')),
    ADD COLUMN     "type" "InvoiceType" NOT NULL DEFAULT 'SALE',
    ADD COLUMN     "providerRef" TEXT,
    ADD COLUMN     "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Ensure issuedAt reflects historic creation times
UPDATE "Invoice" SET "issuedAt" = "createdAt";

-- Backfill invoice numbers in deterministic order
WITH ordered AS (
    SELECT "id", row_number() OVER (ORDER BY "issuedAt", "id") AS rn
    FROM "Invoice"
)
UPDATE "Invoice"
SET "number" = concat('INV-', to_char("issuedAt", 'YYYYMMDD'), '-', lpad(ordered.rn::text, 6, '0'))
FROM ordered
WHERE ordered."id" = "Invoice"."id";

-- Align invoice number sequence with backfilled values
SELECT setval('"Invoice_number_seq"', COALESCE((
    SELECT MAX((split_part("number", '-', 3))::BIGINT) FROM "Invoice"
), 0) + 1, false);

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "number" SET NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "UserEntitlement_userId_key_expiresAt_idx";
DROP INDEX IF EXISTS "UserEntitlement_userId_key_key";

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_endsAt_idx" ON "Subscription"("endsAt");
CREATE UNIQUE INDEX "PaymentWebhookLog_provider_externalId_key" ON "PaymentWebhookLog"("provider", "externalId");
CREATE INDEX "PaymentWebhookLog_receivedAt_idx" ON "PaymentWebhookLog"("receivedAt");
CREATE INDEX "PaymentWebhookLog_status_idx" ON "PaymentWebhookLog"("status");
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE INDEX "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");
CREATE UNIQUE INDEX "UserEntitlement_userId_key_expiresAt_key" ON "UserEntitlement"("userId", "key", "expiresAt");
CREATE INDEX "UserEntitlement_userId_key_idx" ON "UserEntitlement"("userId", "key");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentWebhookLog" ADD CONSTRAINT "PaymentWebhookLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
