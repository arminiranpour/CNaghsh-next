CREATE TYPE "ChallengeStatus" AS ENUM ('draft', 'published', 'archived');

CREATE TYPE "ChallengeParticipationStatus" AS ENUM (
  'registered',
  'payment_pending',
  'submitted',
  'reviewed',
  'accepted',
  'rejected'
);

ALTER TYPE "PurchaseType" ADD VALUE 'challenge_participation';

ALTER TABLE "CheckoutSession"
ADD COLUMN "challengeId" TEXT,
ADD COLUMN "challengeParticipationId" TEXT;

CREATE TABLE "Challenge" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "conditions" TEXT NOT NULL,
  "mediaLengthLimitSec" INTEGER,
  "instructions" TEXT NOT NULL,
  "priceIrr" INTEGER NOT NULL DEFAULT 0,
  "prerequisite" TEXT NOT NULL,
  "howHeld" TEXT NOT NULL,
  "sideNote" TEXT,
  "coverMediaAssetId" TEXT,
  "instructionVideoMediaAssetId" TEXT,
  "status" "ChallengeStatus" NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChallengeParticipation" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "ChallengeParticipationStatus" NOT NULL DEFAULT 'payment_pending',
  "submissionMediaAssetId" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChallengeParticipation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CheckoutSession_challengeId_idx" ON "CheckoutSession"("challengeId");
CREATE INDEX "CheckoutSession_challengeParticipationId_idx" ON "CheckoutSession"("challengeParticipationId");

CREATE INDEX "Challenge_status_startDate_endDate_idx" ON "Challenge"("status", "startDate", "endDate");
CREATE INDEX "Challenge_createdAt_idx" ON "Challenge"("createdAt");

CREATE UNIQUE INDEX "ChallengeParticipation_challengeId_userId_key" ON "ChallengeParticipation"("challengeId", "userId");
CREATE INDEX "ChallengeParticipation_userId_status_idx" ON "ChallengeParticipation"("userId", "status");
CREATE INDEX "ChallengeParticipation_submissionMediaAssetId_idx" ON "ChallengeParticipation"("submissionMediaAssetId");

ALTER TABLE "CheckoutSession"
ADD CONSTRAINT "CheckoutSession_challengeId_fkey"
FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CheckoutSession"
ADD CONSTRAINT "CheckoutSession_challengeParticipationId_fkey"
FOREIGN KEY ("challengeParticipationId") REFERENCES "ChallengeParticipation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Challenge"
ADD CONSTRAINT "Challenge_coverMediaAssetId_fkey"
FOREIGN KEY ("coverMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Challenge"
ADD CONSTRAINT "Challenge_instructionVideoMediaAssetId_fkey"
FOREIGN KEY ("instructionVideoMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChallengeParticipation"
ADD CONSTRAINT "ChallengeParticipation_challengeId_fkey"
FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChallengeParticipation"
ADD CONSTRAINT "ChallengeParticipation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChallengeParticipation"
ADD CONSTRAINT "ChallengeParticipation_submissionMediaAssetId_fkey"
FOREIGN KEY ("submissionMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
