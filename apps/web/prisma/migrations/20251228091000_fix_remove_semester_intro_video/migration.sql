-- DropForeignKey
ALTER TABLE "Semester" DROP CONSTRAINT IF EXISTS "Semester_introVideoMediaAssetId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Semester_introVideoMediaAssetId_idx";

-- AlterTable
ALTER TABLE "Semester" DROP COLUMN IF EXISTS "introVideoMediaAssetId";
