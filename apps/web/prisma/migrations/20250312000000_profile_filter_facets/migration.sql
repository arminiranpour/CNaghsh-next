-- Create new enums for profile filters
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE "EducationLevel" AS ENUM ('DIPLOMA', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'PHD', 'OTHER');

-- Add filterable fields to Profile
ALTER TABLE "Profile"
  ADD COLUMN "birthDate" TIMESTAMP(3),
  ADD COLUMN "gender" "Gender",
  ADD COLUMN "educationLevel" "EducationLevel";

-- Helpful indexes for filtering
CREATE INDEX "Profile_birthDate_idx" ON "Profile"("birthDate");
CREATE INDEX "Profile_gender_idx" ON "Profile"("gender");
CREATE INDEX "Profile_educationLevel_idx" ON "Profile"("educationLevel");
