-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "introVideoMediaId" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "introVideoMediaId" TEXT;

-- CreateIndex
CREATE INDEX "Profile_introVideoMediaId_idx" ON "Profile"("introVideoMediaId");

-- CreateIndex
CREATE INDEX "Job_introVideoMediaId_idx" ON "Job"("introVideoMediaId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_introVideoMediaId_fkey" FOREIGN KEY ("introVideoMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_introVideoMediaId_fkey" FOREIGN KEY ("introVideoMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
