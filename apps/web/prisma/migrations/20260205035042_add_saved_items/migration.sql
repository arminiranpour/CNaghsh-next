-- CreateEnum
CREATE TYPE "SavedItemType" AS ENUM ('MOVIE', 'PROFILE', 'BOOK', 'MONOLOGUE');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "likesCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SavedItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SavedItemType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedItem_userId_type_createdAt_idx" ON "SavedItem"("userId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedItem_userId_type_entityId_key" ON "SavedItem"("userId", "type", "entityId");

-- AddForeignKey
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
