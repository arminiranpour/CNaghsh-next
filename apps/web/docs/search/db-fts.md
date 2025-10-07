# Sprint 4 — Database Search Layer

## Overview

This sprint enables PostgreSQL full-text search (FTS) and trigram-based fuzzy matching for both performer profiles and job postings. Search vectors are generated in the database, stored alongside each row, and refreshed automatically via triggers so application queries can focus on ranking and pagination.

## Search vector inputs

### Profiles

The profile `search_vector` aggregates the following fields after running them through `fa_unaccent` and the `simple` text search configuration:

- `stageName`
- `firstName`
- `lastName`
- `bio`
- `skills` (flattened array)

### Jobs

The job `search_vector` aggregates:

- `title`
- `description`
- `category`
- `payType`

## Indexes

To keep queries fast the migration installs:

- `idx_profile_search_vector` and `idx_job_search_vector` — GIN indexes over each `search_vector`
- Trigram GIN indexes for profile stage/name combinations, job titles, and job cities to accelerate fuzzy matching

## Ranking & fallbacks

- Primary ranking uses `ts_rank_cd(search_vector, plainto_tsquery('simple', fa_unaccent(:query)))`
- When fewer than three matches are returned, the server-side search falls back to trigram similarity on the concatenated display name (profiles) or title (jobs)
- Trigram fallback keeps a similarity guard (`similarity >= 0.3`) before ordering by similarity and recency

## Persian language notes

- PostgreSQL's `simple` configuration combined with the `unaccent` extension gives reasonable tokenization for Persian text without stemming
- Trigram (`pg_trgm`) indexes continue to work on Persian strings thanks to Unicode support, covering misspellings and half-spaces
- Developers should continue normalizing user-facing strings via `fa_unaccent` or the helpers in `apps/web/lib/search/sql.ts` whenever adding new search surfaces
