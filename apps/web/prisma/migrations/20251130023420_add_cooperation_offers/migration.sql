-- CreateEnum
CREATE TYPE "CooperationOfferStatus" AS ENUM ('pending', 'accepted', 'declined', 'canceled', 'expired');

-- CreateEnum
CREATE TYPE "CooperationEventType" AS ENUM ('status_change', 'note', 'system');

-- CreateTable
CREATE TABLE "CooperationOffer" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "roleId" TEXT,
    "senderUserId" TEXT NOT NULL,
    "receiverUserId" TEXT NOT NULL,
    "applicationId" TEXT,
    "status" "CooperationOfferStatus" NOT NULL DEFAULT 'pending',
    "initialMessage" TEXT NOT NULL,
    "internalNote" TEXT,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CooperationOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CooperationEvent" (
    "id" TEXT NOT NULL,
    "cooperationOfferId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "CooperationEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CooperationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_coop_offer_receiver_status_created" ON "CooperationOffer"("receiverUserId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_coop_offer_job_status_created" ON "CooperationOffer"("jobId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_coop_offer_created" ON "CooperationOffer"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_coop_evt_offer_created" ON "CooperationEvent"("cooperationOfferId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_coop_evt_actor" ON "CooperationEvent"("actorUserId");

-- AddForeignKey
ALTER TABLE "CooperationOffer" ADD CONSTRAINT "CooperationOffer_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CooperationOffer" ADD CONSTRAINT "CooperationOffer_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CooperationOffer" ADD CONSTRAINT "CooperationOffer_receiverUserId_fkey" FOREIGN KEY ("receiverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CooperationOffer" ADD CONSTRAINT "CooperationOffer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CooperationEvent" ADD CONSTRAINT "CooperationEvent_cooperationOfferId_fkey" FOREIGN KEY ("cooperationOfferId") REFERENCES "CooperationOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CooperationEvent" ADD CONSTRAINT "CooperationEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
