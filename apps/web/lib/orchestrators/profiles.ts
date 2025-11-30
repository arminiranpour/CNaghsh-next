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
  const normalizedAge = normalizeAgeRange(filterParams.ageMin, filterParams.ageMax);
  const genderFilters = mapToEnum(filterParams.gender, {
    male: "MALE",
    female: "FEMALE",
    other: "OTHER",
  });
  const educationFilters = mapToEnum(filterParams.edu, {
    diploma: "DIPLOMA",
    associate: "ASSOCIATE",
    bachelor: "BACHELOR",
    master: "MASTER",
    phd: "PHD",
    other: "OTHER",
  });

  const filtersForCanonical: ProfilesQueryInput = {
    ...filterParams,
    ageMin: normalizedAge?.min,
    ageMax: normalizedAge?.max,
    gender: filterParams.gender,
  };

  const searchParams: ProfileSearchParams = {
    query: filterParams.query,
    city: filterParams.city,
    skills: filterParams.skills,
    gender: genderFilters,
    educationLevels: educationFilters,
    languages: filterParams.lang,
    accents: filterParams.accent,
    birthDateFrom: normalizedAge?.max ? yearsAgo(normalizedAge.max) : undefined,
    birthDateTo: normalizedAge?.min ? yearsAgo(normalizedAge.min) : undefined,
    ageRange: normalizedAge,
    sort: filterParams.sort,
    page,
  };

  const cacheKeyHash = hashKey(searchParams);
  const cacheKeys = [TAG_PREFIX, cacheKeyHash];
  const tags = [`${TAG_PREFIX}`, `${TAG_PREFIX}:${cacheKeyHash}`];

  const executeSearch = async () => {
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
  };

  let data: ProfileSearchResult;
  const shouldBypassCache = process.env.ORCH_BYPASS_CACHE === "1";

  if (shouldBypassCache) {
    console.info("[orchestrator:profiles] cache_bypass", { hash: cacheKeyHash });
    data = await executeSearch();
  } else {
    const resolve = unstable_cache(executeSearch, cacheKeys, { revalidate: CACHE_TTL, tags });

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
      data = await executeSearch();
    }
  }
  if (parsed.empty) {
    console.info("[orchestrator:profiles] default_params_applied", { hash: cacheKeyHash });
  }

  return {
    items: data.items,
    page: data.page,
    pageSize: data.pageSize ?? DEFAULT_PAGE_SIZE,
    canonical: buildCanonical("/profiles", { ...filtersForCanonical, page: data.page }),
    appliedFilters: buildAppliedFilters(filtersForCanonical),
  };
}

function mapToEnum<T extends string, TEnum extends string>(
  values: T[] | undefined,
  mapping: Record<T, TEnum>,
): TEnum[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  const mapped: TEnum[] = [];
  const seen = new Set<TEnum>();

  for (const value of values) {
    const mappedValue = mapping[value];
    if (!mappedValue || seen.has(mappedValue)) {
      continue;
    }
    seen.add(mappedValue);
    mapped.push(mappedValue);
  }

  return mapped.length ? mapped : undefined;
}

function normalizeAgeRange(min?: number, max?: number) {
  const safeMin = typeof min === "number" && Number.isFinite(min) && min > 0 ? min : undefined;
  const safeMax = typeof max === "number" && Number.isFinite(max) && max > 0 ? max : undefined;

  if (!safeMin && !safeMax) {
    return undefined;
  }

  if (safeMin && safeMax && safeMin > safeMax) {
    return { min: safeMax, max: safeMin };
  }

  return { min: safeMin, max: safeMax };
}

function yearsAgo(years: number) {
  const now = new Date();
  const result = new Date(now);
  result.setFullYear(now.getFullYear() - years);
  return result;
}
