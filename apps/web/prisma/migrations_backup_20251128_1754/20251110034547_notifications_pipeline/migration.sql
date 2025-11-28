/*
  Warnings:

  - A unique constraint covering the columns `[dedupeKey]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('BILLING_TRANSACTIONAL', 'BILLING_REMINDERS');

-- CreateEnum
CREATE TYPE "NotificationDispatchStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NotificationJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'BILLING_SUBSCRIPTION_RENEWED';
ALTER TYPE "NotificationType" ADD VALUE 'BILLING_SUBSCRIPTION_EXPIRY_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'BILLING_SUBSCRIPTION_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'BILLING_PAYMENT_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'BILLING_INVOICE_READY';
ALTER TYPE "NotificationType" ADD VALUE 'BILLING_INVOICE_REFUND_READY';
ALTER TYPE "NotificationType" ADD VALUE 'BILLING_WEBHOOK_ALERT';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "dedupeKey" VARCHAR(255);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "timezone" VARCHAR(64);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationMessageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "eventType" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "dedupeKey" VARCHAR(255) NOT NULL,
    "status" "NotificationDispatchStatus" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationJob" (
    "id" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "status" "NotificationJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationPreference_category_idx" ON "NotificationPreference"("category");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_category_key" ON "NotificationPreference"("userId", "category");

-- CreateIndex
CREATE INDEX "NotificationMessageLog_userId_idx" ON "NotificationMessageLog"("userId");

-- CreateIndex
CREATE INDEX "NotificationMessageLog_channel_idx" ON "NotificationMessageLog"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationMessageLog_dedupeKey_channel_key" ON "NotificationMessageLog"("dedupeKey", "channel");

-- CreateIndex
CREATE INDEX "NotificationJob_status_runAt_idx" ON "NotificationJob"("status", "runAt");

-- CreateIndex
CREATE INDEX "Notification_dedupeKey_idx" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationMessageLog" ADD CONSTRAINT "NotificationMessageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_logId_fkey" FOREIGN KEY ("logId") REFERENCES "NotificationMessageLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
