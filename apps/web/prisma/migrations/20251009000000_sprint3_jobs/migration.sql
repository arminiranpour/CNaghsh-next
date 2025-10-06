-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "JobModeration" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "cityId" VARCHAR(64),
    "payType" VARCHAR(32),
    "payAmount" INTEGER,
    "currency" VARCHAR(3),
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "moderation" "JobModeration" NOT NULL DEFAULT 'PENDING',
    "featuredUntil" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_status_moderation_featuredUntil_idx" ON "Job"("status", "moderation", "featuredUntil");

-- CreateIndex
CREATE INDEX "Job_category_idx" ON "Job"("category");

-- CreateIndex
CREATE INDEX "Job_cityId_idx" ON "Job"("cityId");

-- CreateIndex
CREATE INDEX "Job_title_idx" ON "Job"("title");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
