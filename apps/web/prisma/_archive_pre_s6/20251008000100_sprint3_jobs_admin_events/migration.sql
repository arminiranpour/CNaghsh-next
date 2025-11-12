-- CreateEnum
CREATE TYPE "JobAdminAction" AS ENUM ('APPROVE', 'REJECT', 'SUSPEND', 'FEATURE', 'UNFEATURE', 'CLOSE');

-- CreateTable
CREATE TABLE "JobModerationEvent" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" "JobAdminAction" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobModerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobModerationEvent_jobId_createdAt_idx" ON "JobModerationEvent"("jobId", "createdAt");
CREATE INDEX "JobModerationEvent_adminId_idx" ON "JobModerationEvent"("adminId");

-- AddForeignKey
ALTER TABLE "JobModerationEvent" ADD CONSTRAINT "JobModerationEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobModerationEvent" ADD CONSTRAINT "JobModerationEvent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
