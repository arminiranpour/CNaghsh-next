import { unstable_cache } from "next/cache";

import { buildCanonical } from "@/lib/seo/canonical";
import { runJobSearch, type JobSearchParams } from "@/lib/search/runJobSearch";
import { DEFAULT_PAGE_SIZE } from "@/lib/search/sql";

import { jobsQuerySchema, type JobsQueryInput } from "./schema";
import {
  buildAppliedFilters,
  canonicalizeInput,
  hashKey,
  isMissingIncrementalCacheError,
  parseWithClamp,
  type OrchestratedResult,
} from "./util";

const CACHE_TTL = 60; // seconds
const TAG_PREFIX = "search:jobs";

type JobSearchResult = Awaited<ReturnType<typeof runJobSearch>>;
type JobItem = JobSearchResult["items"][number];

export async function fetchJobsOrchestrated(
  raw: URLSearchParams | Record<string, unknown>,
): Promise<OrchestratedResult<JobItem>> {
  const normalized = canonicalizeInput(raw);
  const parsed = parseWithClamp(jobsQuerySchema, normalized);
  if (parsed.clamped) {
    console.warn("[orchestrator:jobs] input_clamped", {
      issues: parsed.issues.map((issue) => ({ path: issue.path, message: issue.message })),
    });
  }

  const filterParams = parsed.empty ? ({} as JobsQueryInput) : parsed.params;
  const page = filterParams.page ?? 1;

  const searchParams: JobSearchParams = {
    query: filterParams.query,
    city: filterParams.city,
    category: filterParams.category,
    sort: filterParams.sort,
    page,
  };

  const cacheKeyHash = hashKey(searchParams);
  const cacheKeys = [TAG_PREFIX, cacheKeyHash];
  const tags = [`${TAG_PREFIX}`, `${TAG_PREFIX}:${cacheKeyHash}`];

  const resolve = unstable_cache(
    async () => {
      const startedAt = Date.now();
      const result = await runJobSearch(searchParams);
      const durationMs = Date.now() - startedAt;
      console.info("[orchestrator:jobs] search_complete", {
        hash: cacheKeyHash,
        durationMs,
        page: result.page,
        pageSize: result.pageSize,
        itemCount: result.items.length,
      });
      return result;
    },
    cacheKeys,
    { revalidate: CACHE_TTL, tags },
  );

  let data: JobSearchResult;

  try {
    data = await resolve();
  } catch (error) {
    if (!isMissingIncrementalCacheError(error)) {
      throw error;
    }

    console.warn(
      "[orchestrator:jobs] cache_unavailable_falling_back",
      error instanceof Error ? { message: error.message } : undefined,
    );
    data = await runJobSearch(searchParams);
  }

  if (parsed.empty) {
    console.info("[orchestrator:jobs] default_params_applied", { hash: cacheKeyHash });
  }

  return {
    items: data.items,
    page: data.page,
    pageSize: data.pageSize ?? DEFAULT_PAGE_SIZE,
    canonical: buildCanonical("/jobs", { ...filterParams, page: data.page }),
    appliedFilters: buildAppliedFilters(filterParams),
  };
}
