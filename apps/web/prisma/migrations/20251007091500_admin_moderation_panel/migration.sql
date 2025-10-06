-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('APPROVE', 'REJECT', 'REVERT_TO_PENDING', 'HIDE', 'UNHIDE', 'SYSTEM_AUTO_UNPUBLISH');

-- AlterTable
ALTER TABLE "Profile"
  ADD COLUMN "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "moderationNotes" TEXT,
  ADD COLUMN "moderatedBy" TEXT,
  ADD COLUMN "moderatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ModerationEvent" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" "ModerationAction" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Profile"
  ADD CONSTRAINT "Profile_moderatedBy_fkey" FOREIGN KEY ("moderatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationEvent"
  ADD CONSTRAINT "ModerationEvent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationEvent"
  ADD CONSTRAINT "ModerationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Profile_moderationStatus_idx" ON "Profile"("moderationStatus");

-- CreateIndex
CREATE INDEX "Profile_updatedAt_idx" ON "Profile"("updatedAt");

-- CreateIndex
CREATE INDEX "ModerationEvent_profileId_createdAt_idx" ON "ModerationEvent"("profileId", "createdAt");
