-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "SemesterStatus" AS ENUM ('draft', 'open', 'closed');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('pending_payment', 'active', 'canceled', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('lumpsum', 'installments');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri');

-- CreateEnum
CREATE TYPE "CourseDurationUnit" AS ENUM ('day', 'month', 'year');

-- CreateEnum
CREATE TYPE "PurchaseType" AS ENUM ('course_semester');

-- AlterTable
ALTER TABLE "CheckoutSession" ADD COLUMN "purchaseType" "PurchaseType",
ADD COLUMN "courseId" TEXT,
ADD COLUMN "semesterId" TEXT,
ADD COLUMN "enrollmentId" TEXT;

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ageRangeText" TEXT NOT NULL,
    "durationValue" INTEGER NOT NULL,
    "durationUnit" "CourseDurationUnit" NOT NULL,
    "instructorName" TEXT NOT NULL,
    "prerequisiteText" TEXT NOT NULL,
    "bannerMediaAssetId" TEXT,
    "introVideoMediaAssetId" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "tuitionAmountIrr" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "lumpSumDiscountAmountIrr" INTEGER NOT NULL DEFAULT 0,
    "installmentPlanEnabled" BOOLEAN NOT NULL DEFAULT false,
    "installmentCount" INTEGER,
    "status" "SemesterStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SemesterScheduleDay" (
    "id" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,

    CONSTRAINT "SemesterScheduleDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SemesterClassSlot" (
    "id" TEXT NOT NULL,
    "scheduleDayId" TEXT NOT NULL,
    "title" TEXT,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,

    CONSTRAINT "SemesterClassSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'pending_payment',
    "chosenPaymentMode" "PaymentMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckoutSession_courseId_idx" ON "CheckoutSession"("courseId");

-- CreateIndex
CREATE INDEX "CheckoutSession_semesterId_idx" ON "CheckoutSession"("semesterId");

-- CreateIndex
CREATE INDEX "CheckoutSession_enrollmentId_idx" ON "CheckoutSession"("enrollmentId");

-- CreateIndex
CREATE INDEX "CheckoutSession_purchaseType_idx" ON "CheckoutSession"("purchaseType");

-- CreateIndex
CREATE INDEX "Course_status_idx" ON "Course"("status");

-- CreateIndex
CREATE INDEX "Course_createdAt_idx" ON "Course"("createdAt");

-- CreateIndex
CREATE INDEX "Semester_courseId_status_idx" ON "Semester"("courseId", "status");

-- CreateIndex
CREATE INDEX "Semester_startsAt_idx" ON "Semester"("startsAt");

-- CreateIndex
CREATE INDEX "Semester_endsAt_idx" ON "Semester"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "SemesterScheduleDay_semesterId_dayOfWeek_key" ON "SemesterScheduleDay"("semesterId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "SemesterClassSlot_scheduleDayId_idx" ON "SemesterClassSlot"("scheduleDayId");

-- CreateIndex
CREATE UNIQUE INDEX "SemesterClassSlot_scheduleDayId_startMinute_endMinute_key" ON "SemesterClassSlot"("scheduleDayId", "startMinute", "endMinute");

-- CreateIndex
CREATE INDEX "Enrollment_userId_idx" ON "Enrollment"("userId");

-- CreateIndex
CREATE INDEX "Enrollment_semesterId_status_idx" ON "Enrollment"("semesterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_semesterId_userId_key" ON "Enrollment"("semesterId", "userId");

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_bannerMediaAssetId_fkey" FOREIGN KEY ("bannerMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_introVideoMediaAssetId_fkey" FOREIGN KEY ("introVideoMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemesterScheduleDay" ADD CONSTRAINT "SemesterScheduleDay_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemesterClassSlot" ADD CONSTRAINT "SemesterClassSlot_scheduleDayId_fkey" FOREIGN KEY ("scheduleDayId") REFERENCES "SemesterScheduleDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
