import { unstable_cache } from "next/cache";

import { Prisma } from "@prisma/client";

import { CACHE_REVALIDATE, CACHE_TAGS, shouldBypassCache } from "@/lib/cache/config";
import { prisma } from "@/lib/prisma";

import { PUBLIC_JOB_SORTS, PUBLIC_JOBS_PAGE_SIZE, type PublicJobSort } from "./constants";

export { PUBLIC_JOBS_PAGE_SIZE } from "./constants";
export type { PublicJobSort } from "./constants";

export type PublicJobQueryParams = {
  city?: string;
  category?: string;
  remote?: boolean;
  payType?: string;
  sort?: PublicJobSort;
  page?: number;
};

export type PublicJobWithOwner = Prisma.JobGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        profile: {
          select: {
            id: true;
            stageName: true;
            firstName: true;
            lastName: true;
          };
        };
      };
    };
  };
}>;

const BASE_VISIBILITY_WHERE: Prisma.JobWhereInput = {
  status: "PUBLISHED",
  moderation: "APPROVED",
};

type NormalizedPublicJobQueryParams = Required<Pick<PublicJobQueryParams, "remote" | "sort" | "page">> &
  Omit<PublicJobQueryParams, "remote" | "sort" | "page">;

function normalizePublicJobQueryParams(
  params: PublicJobQueryParams = {},
): NormalizedPublicJobQueryParams {
  const page = Math.max(params.page ?? 1, 1);
  let sort: PublicJobSort = "newest";

  if (params.sort && PUBLIC_JOB_SORTS.includes(params.sort)) {
    sort = params.sort;
  }

  return {
    city: params.city,
    category: params.category,
    payType: params.payType,
    remote: Boolean(params.remote),
    sort,
    page,
  } satisfies NormalizedPublicJobQueryParams;
}

function buildCacheKey(params: NormalizedPublicJobQueryParams): string {
  return JSON.stringify({
    city: params.city ?? null,
    category: params.category ?? null,
    payType: params.payType ?? null,
    remote: params.remote ? 1 : 0,
    sort: params.sort,
    page: params.page,
  });
}

function buildJobsListTags(params: NormalizedPublicJobQueryParams): string[] {
  const tags = new Set<string>([
    CACHE_TAGS.jobsList,
    CACHE_TAGS.jobsListSort(params.sort),
    CACHE_TAGS.jobsListRemote(params.remote),
  ]);

  if (params.city) {
    tags.add(CACHE_TAGS.jobsListCity(params.city));
  }

  if (params.category) {
    tags.add(CACHE_TAGS.jobsListCategory(params.category));
  }

  if (params.payType) {
    tags.add(CACHE_TAGS.jobsListPayType(params.payType));
  }

  return Array.from(tags);
}

function logTiming(label: string, start: bigint, metadata: string) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const elapsed = Number(process.hrtime.bigint() - start) / 1_000_000;
  console.info(`${label} duration=${elapsed.toFixed(1)}ms ${metadata}`);
}

export function buildPublicWhere(
  params: Pick<PublicJobQueryParams, "city" | "category" | "remote" | "payType">
): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = {
    ...BASE_VISIBILITY_WHERE,
  };

  if (params.city) {
    where.cityId = params.city;
  }

  if (params.category) {
    where.category = params.category;
  }

  if (params.remote) {
    where.remote = true;
  }

  if (params.payType) {
    where.payType = params.payType;
  }

  return where;
}

export function buildPublicOrderBy(
  sort: PublicJobSort | undefined
): Prisma.JobOrderByWithRelationInput[] {
  switch (sort) {
    case "featured":
      return [
        { featuredUntil: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ];
    case "expiring":
      return [
        { featuredUntil: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ];
    case "newest":
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function getPublicJobs(params: PublicJobQueryParams = {}) {
  const normalized = normalizePublicJobQueryParams(params);
  const cacheKey = buildCacheKey(normalized);
  const skip = (normalized.page - 1) * PUBLIC_JOBS_PAGE_SIZE;
  const tags = buildJobsListTags(normalized);

  const resolver = async () => {
    const where = buildPublicWhere({
      city: normalized.city,
      category: normalized.category,
      remote: normalized.remote,
      payType: normalized.payType,
    });

    const orderBy = buildPublicOrderBy(normalized.sort);

    const [items, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: PUBLIC_JOBS_PAGE_SIZE,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profile: {
                select: {
                  id: true,
                  stageName: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    return {
      items,
      total,
      page: normalized.page,
      pageSize: PUBLIC_JOBS_PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / PUBLIC_JOBS_PAGE_SIZE)),
    };
  };

  if (shouldBypassCache()) {
    const start = process.hrtime.bigint();
    const result = await resolver();
    logTiming("[orch:jobs] bypass_cache", start, `key=${cacheKey}`);
    return result;
  }

  const resolve = unstable_cache(resolver, ["public-jobs", cacheKey], {
    revalidate: CACHE_REVALIDATE.jobsList,
    tags,
  });

  const start = process.hrtime.bigint();
  const result = await resolve();
  logTiming("[orch:jobs]", start, `key=${cacheKey}`);
  return result;
}

export async function getPublicJobById(id: string) {
  if (!id) {
    return null;
  }

  const resolver = async () =>
    prisma.job.findFirst({
      where: {
        ...BASE_VISIBILITY_WHERE,
        id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                id: true,
                stageName: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

  if (shouldBypassCache()) {
    const start = process.hrtime.bigint();
    const result = await resolver();
    logTiming("[orch:jobs] bypass_cache", start, `key=${id}`);
    return result;
  }

  const resolve = unstable_cache(resolver, ["public-job", id], {
    revalidate: CACHE_REVALIDATE.jobDetail,
    tags: [CACHE_TAGS.jobDetail(id), CACHE_TAGS.jobsList],
  });

  const start = process.hrtime.bigint();
  const result = await resolve();
  logTiming("[orch:jobs]", start, `key=${id}`);
  return result;
}

export async function getPublicJobFilters() {
  const resolver = async () => {
    const where = { ...BASE_VISIBILITY_WHERE } satisfies Prisma.JobWhereInput;

    const [categories, payTypes] = await Promise.all([
      prisma.job.findMany({
        where,
        distinct: ["category"],
        orderBy: { category: "asc" },
        select: { category: true },
      }),
      prisma.job.findMany({
        where: {
          ...where,
          payType: { not: null },
        },
        distinct: ["payType"],
        orderBy: { payType: "asc" },
        select: { payType: true },
      }),
    ]);

    return {
      categories: categories.map((entry) => entry.category).filter(Boolean),
      payTypes: payTypes
        .map((entry) => entry.payType)
        .filter((value): value is string => Boolean(value && value.trim())),
    };
  };

  if (shouldBypassCache()) {
    const start = process.hrtime.bigint();
    const result = await resolver();
    logTiming("[orch:jobs] bypass_cache", start, "key=filters");
    return result;
  }

  const resolve = unstable_cache(resolver, ["public-job-filters"], {
    revalidate: CACHE_REVALIDATE.jobFilters,
    tags: [CACHE_TAGS.jobsFilters, CACHE_TAGS.jobsList],
  });

  const start = process.hrtime.bigint();
  const result = await resolve();
  logTiming("[orch:jobs]", start, "key=filters");
  return result;
}
