/*
  Warnings:

  - You are about to drop the column `search_vector` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `search_vector` on the `Profile` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."idx_job_search_vector";

-- DropIndex
DROP INDEX "public"."idx_profile_search_vector";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "search_vector";

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "search_vector";
