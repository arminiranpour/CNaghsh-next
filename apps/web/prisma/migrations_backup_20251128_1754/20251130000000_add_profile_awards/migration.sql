-- CreateTable
CREATE TABLE "ProfileAward" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "place" TEXT,
    "awardDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfileAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileAward_profileId_awardDate_idx" ON "ProfileAward"("profileId", "awardDate");

-- AddForeignKey
ALTER TABLE "ProfileAward" ADD CONSTRAINT "ProfileAward_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
