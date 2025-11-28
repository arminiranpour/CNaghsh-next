-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('new', 'shortlist', 'reject', 'select', 'withdrawn');

-- CreateEnum
CREATE TYPE "ApplicationEventType" AS ENUM ('status_change', 'note', 'system', 'attachment_add', 'attachment_remove');

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "applicantUserId" TEXT NOT NULL,
    "coverNote" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'new',
    "attachments" JSONB,
    "consents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "ApplicationEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationView" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "viewerUserId" TEXT,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_applicantUserId_key" ON "Application"("jobId", "applicantUserId");

-- CreateIndex
CREATE INDEX "idx_app_job_status" ON "Application"("jobId", "status");

-- CreateIndex
CREATE INDEX "idx_app_applicant" ON "Application"("applicantUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_app_created" ON "Application"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_appevt_app_created" ON "ApplicationEvent"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationView_applicationId_createdAt_idx" ON "ApplicationView"("applicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationView" ADD CONSTRAINT "ApplicationView_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationView" ADD CONSTRAINT "ApplicationView_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
