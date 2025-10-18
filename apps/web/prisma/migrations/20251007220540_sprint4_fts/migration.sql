-- Make destructive ops shadow-safe and idempotent.
-- Wrap in a transaction so either all changes apply or none.
BEGIN;

-- Drop the FTS indexes only if they exist.
DO $$
BEGIN
  IF to_regclass('public.idx_job_search_vector') IS NOT NULL THEN
    EXECUTE 'DROP INDEX public."idx_job_search_vector"';
  END IF;

  IF to_regclass('public.idx_profile_search_vector') IS NOT NULL THEN
    EXECUTE 'DROP INDEX public."idx_profile_search_vector"';
  END IF;
END $$;

-- Drop columns only if they exist (safe for shadow DB replays).
ALTER TABLE "Job"     DROP COLUMN IF EXISTS "search_vector";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "search_vector";

COMMIT;