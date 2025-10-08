import { unstable_cache } from "next/cache";

import { buildCanonical } from "@/lib/seo/canonical";
import { runProfileSearch, type ProfileSearchParams } from "@/lib/search/runProfileSearch";
import { DEFAULT_PAGE_SIZE } from "@/lib/search/sql";

import { profilesQuerySchema, type ProfilesQueryInput } from "./schema";
import {
  buildAppliedFilters,
  canonicalizeInput,
  hashKey,
  isMissingIncrementalCacheError,
  parseWithClamp,
  type OrchestratedResult,
} from "./util";

const CACHE_TTL = 60; // seconds
const TAG_PREFIX = "search:profiles";

type ProfileSearchResult = Awaited<ReturnType<typeof runProfileSearch>>;
type ProfileItem = ProfileSearchResult["items"][number];

export async function fetchProfilesOrchestrated(
  raw: URLSearchParams | Record<string, unknown>,
): Promise<OrchestratedResult<ProfileItem>> {
  const normalized = canonicalizeInput(raw);
  const parsed = parseWithClamp(profilesQuerySchema, normalized);
  if (parsed.clamped) {
    console.warn("[orchestrator:profiles] input_clamped", {
      issues: parsed.issues.map((issue) => ({ path: issue.path, message: issue.message })),
    });
  }

  const filterParams = parsed.empty ? ({} as ProfilesQueryInput) : parsed.params;
  const page = filterParams.page ?? 1;

  const searchParams: ProfileSearchParams = {
    query: filterParams.query,
    city: filterParams.city,
    skills: filterParams.skills,
    sort: filterParams.sort,
    page,
  };

  const cacheKeyHash = hashKey(searchParams);
  const cacheKeys = [TAG_PREFIX, cacheKeyHash];
  const tags = [`${TAG_PREFIX}`, `${TAG_PREFIX}:${cacheKeyHash}`];

  const resolve = unstable_cache(
    async () => {
      const startedAt = Date.now();
      const result = await runProfileSearch(searchParams);
      const durationMs = Date.now() - startedAt;
      console.info("[orchestrator:profiles] search_complete", {
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

  let data: ProfileSearchResult;

  try {
    data = await resolve();
  } catch (error) {
    if (!isMissingIncrementalCacheError(error)) {
      throw error;
    }

    console.warn(
      "[orchestrator:profiles] cache_unavailable_falling_back",
      error instanceof Error ? { message: error.message } : undefined,
    );
    data = await runProfileSearch(searchParams);
  }
  if (parsed.empty) {
    console.info("[orchestrator:profiles] default_params_applied", { hash: cacheKeyHash });
  }

  return {
    items: data.items,
    page: data.page,
    pageSize: data.pageSize ?? DEFAULT_PAGE_SIZE,
    canonical: buildCanonical("/profiles", { ...filterParams, page: data.page }),
    appliedFilters: buildAppliedFilters(filterParams),
  };
}
