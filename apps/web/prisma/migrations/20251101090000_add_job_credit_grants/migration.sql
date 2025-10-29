-- CreateTable
CREATE TABLE "JobCreditGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'JOB_CREDIT_PURCHASE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobCreditGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobCreditGrant_paymentId_key" ON "JobCreditGrant"("paymentId");

-- CreateIndex
CREATE INDEX "JobCreditGrant_userId_idx" ON "JobCreditGrant"("userId");

-- CreateIndex
CREATE INDEX "JobCreditGrant_createdAt_idx" ON "JobCreditGrant"("createdAt");

-- AddForeignKey
ALTER TABLE "JobCreditGrant" ADD CONSTRAINT "JobCreditGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCreditGrant" ADD CONSTRAINT "JobCreditGrant_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
