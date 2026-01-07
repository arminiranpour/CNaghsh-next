-- CreateEnum
CREATE TYPE "CourseInstallmentStatus" AS ENUM ('due', 'paid', 'failed');

-- AlterTable
ALTER TABLE "CheckoutSession"
ADD COLUMN "paymentMode" "PaymentMode",
ADD COLUMN "installmentIndex" INTEGER,
ADD COLUMN "idempotencyKey" TEXT;

-- CreateTable
CREATE TABLE "CoursePaymentPlan" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "installmentAmountIrr" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoursePaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursePaymentInstallment" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "amountIrr" INTEGER NOT NULL,
    "status" "CourseInstallmentStatus" NOT NULL DEFAULT 'due',
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidPaymentId" TEXT,

    CONSTRAINT "CoursePaymentInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_idempotencyKey_key" ON "CheckoutSession"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "CoursePaymentPlan_enrollmentId_key" ON "CoursePaymentPlan"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CoursePaymentInstallment_enrollmentId_index_key" ON "CoursePaymentInstallment"("enrollmentId", "index");

-- CreateIndex
CREATE INDEX "CoursePaymentInstallment_enrollmentId_status_idx" ON "CoursePaymentInstallment"("enrollmentId", "status");

-- CreateIndex
CREATE INDEX "CoursePaymentInstallment_paidPaymentId_idx" ON "CoursePaymentInstallment"("paidPaymentId");

-- AddForeignKey
ALTER TABLE "CoursePaymentPlan" ADD CONSTRAINT "CoursePaymentPlan_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePaymentInstallment" ADD CONSTRAINT "CoursePaymentInstallment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePaymentInstallment" ADD CONSTRAINT "CoursePaymentInstallment_paidPaymentId_fkey" FOREIGN KEY ("paidPaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
