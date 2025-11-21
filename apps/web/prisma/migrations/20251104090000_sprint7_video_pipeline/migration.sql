-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('uploaded', 'processing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "MediaVisibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "TranscodeJobStatus" AS ENUM ('queued', 'processing', 'done', 'failed');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'uploaded',
    "visibility" "MediaVisibility" NOT NULL DEFAULT 'private',
    "ownerUserId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "outputKey" TEXT,
    "posterKey" TEXT,
    "durationSec" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "codec" TEXT,
    "bitrate" INTEGER,
    "sizeBytes" BIGINT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscodeJob" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "TranscodeJobStatus" NOT NULL DEFAULT 'queued',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "logs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscodeJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_outputKey_key" ON "MediaAsset"("outputKey");

-- CreateIndex
CREATE INDEX "MediaAsset_ownerUserId_type_status_idx" ON "MediaAsset"("ownerUserId", "type", "status");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- CreateIndex
CREATE INDEX "TranscodeJob_mediaAssetId_createdAt_idx" ON "TranscodeJob"("mediaAssetId", "createdAt");

-- CreateIndex
CREATE INDEX "TranscodeJob_status_idx" ON "TranscodeJob"("status");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscodeJob" ADD CONSTRAINT "TranscodeJob_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
