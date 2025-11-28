-- AlterTable
ALTER TABLE "Invoice"
  ALTER COLUMN "number" DROP NOT NULL,
  ALTER COLUMN "number" DROP DEFAULT;

ALTER TABLE "Invoice"
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "periodEnd" TIMESTAMP(3),
  ADD COLUMN "periodStart" TIMESTAMP(3),
  ADD COLUMN "planCycle" "PlanCycle",
  ADD COLUMN "planId" TEXT,
  ADD COLUMN "planName" TEXT,
  ADD COLUMN "quantity" INTEGER DEFAULT 1,
  ADD COLUMN "unitAmount" INTEGER;

UPDATE "Invoice" SET "quantity" = 1 WHERE "quantity" IS NULL;

-- Drop old sequence if present
DROP SEQUENCE IF EXISTS "Invoice_number_seq";

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "sequenceDate" TIMESTAMP(3) NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("sequenceDate")
);
