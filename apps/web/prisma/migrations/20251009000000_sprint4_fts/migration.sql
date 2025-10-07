-- Enable extensions (safe if already installed)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add search_vector columns
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE "Job"     ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Helper: normalize text with unaccent
-- (Using built-in unaccent; no custom dict needed)
CREATE OR REPLACE FUNCTION public.fa_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT unaccent($1)
$$;

-- Build vectors
CREATE OR REPLACE FUNCTION public.profile_tsvector(p "Profile")
RETURNS tsvector LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT
    to_tsvector(
      'simple',
      fa_unaccent(
        coalesce(p."stageName",'') || ' ' ||
        coalesce(p."firstName",'') || ' ' ||
        coalesce(p."lastName",'') || ' ' ||
        coalesce(p."bio",'') || ' ' ||
        coalesce((
          SELECT string_agg(skill_value, ' ')
          FROM jsonb_array_elements_text(COALESCE(p."skills", '[]'::jsonb)) AS skill(skill_value)
        ), '')      )
    )
$$;

CREATE OR REPLACE FUNCTION public.job_tsvector(j "Job")
RETURNS tsvector LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT
    to_tsvector(
      'simple',
      fa_unaccent(
        coalesce(j."title",'') || ' ' ||
        coalesce(j."description",'') || ' ' ||
        coalesce(j."category",'') || ' ' ||
        coalesce(j."payType",'')
      )
    )
$$;

-- Triggers to keep vectors fresh
CREATE OR REPLACE FUNCTION public.profile_tsvector_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := public.profile_tsvector(NEW);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.job_tsvector_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := public.job_tsvector(NEW);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profile_tsvector_update ON "Profile";
CREATE TRIGGER profile_tsvector_update
BEFORE INSERT OR UPDATE ON "Profile"
FOR EACH ROW EXECUTE FUNCTION public.profile_tsvector_trigger();

DROP TRIGGER IF EXISTS job_tsvector_update ON "Job";
CREATE TRIGGER job_tsvector_update
BEFORE INSERT OR UPDATE ON "Job"
FOR EACH ROW EXECUTE FUNCTION public.job_tsvector_trigger();

-- Backfill existing rows
UPDATE "Profile" SET search_vector = public.profile_tsvector("Profile");
UPDATE "Job"     SET search_vector = public.job_tsvector("Job");

-- GIN indexes for FTS
CREATE INDEX IF NOT EXISTS idx_profile_search_vector ON "Profile" USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_job_search_vector     ON "Job"     USING GIN (search_vector);

-- Trigram indexes for fuzzy/partial matching
CREATE INDEX IF NOT EXISTS idx_profile_stage_trgm ON "Profile" USING GIN (coalesce("stageName",'') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profile_name_trgm  ON "Profile" USING GIN ((coalesce("firstName",'') || ' ' || coalesce("lastName",'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_job_title_trgm     ON "Job"     USING GIN (coalesce("title",'') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_job_city_trgm      ON "Job"     USING GIN (coalesce("cityId",'') gin_trgm_ops);
