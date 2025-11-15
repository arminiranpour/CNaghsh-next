-- CreateEnum
CREATE TYPE "MediaModerationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "MediaAsset"
ADD COLUMN     "moderationStatus" "MediaModerationStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "moderationReason" TEXT,
ADD COLUMN     "moderationReviewedAt" TIMESTAMP(3),
ADD COLUMN     "moderationReviewedById" TEXT;

-- CreateIndex
CREATE INDEX "MediaAsset_moderationStatus_idx" ON "MediaAsset"("moderationStatus");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_moderationReviewedById_fkey" FOREIGN KEY ("moderationReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
