import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  DEFAULT_PAGE_SIZE,
  SIMILARITY_THRESHOLD,
  buildTsQuery,
  resolveJobSort,
  resolvePagination,
} from "./sql";

type JobSearchSort = "relevance" | "newest" | "featured" | "expiry";

export type JobSearchParams = {
  query?: string;
  city?: string;
  category?: string;
  page?: number;
  pageSize?: number;
  sort?: JobSearchSort;
};

type JobRow = {
  id: string;
  title: string;
  cityId: string | null;
  category: string;
  featuredUntil: Date | null;
  updatedAt: Date;
  rank?: number | null;
  sim?: number | null;
};

type SearchResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
};

const JOB_BASE_WHERE = Prisma.sql`
  j."status" = 'PUBLISHED'
  AND j."moderation" = 'APPROVED'
`;

const JOB_TITLE_EXPRESSION = Prisma.sql`coalesce(j."title",'')`;

export async function runJobSearch(
  params: JobSearchParams,
): Promise<SearchResult<JobRow>> {
  const { page, pageSize, offset } = resolvePagination({
    page: params.page,
    pageSize: params.pageSize,
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });

  const cityClause = params.city
    ? Prisma.sql`AND j."cityId" = ${params.city}`
    : Prisma.sql``;

  const categoryClause = params.category
    ? Prisma.sql`AND j."category" = ${params.category}`
    : Prisma.sql``;

  const hasQuery = Boolean(params.query && params.query.trim().length > 0);

  if (hasQuery && params.query) {
    const normalizedQuery = params.query.trim();
    const createTsQuery = () => buildTsQuery(normalizedQuery);

    const ftsRows = await prisma.$queryRaw<JobRow[]>(Prisma.sql`
      SELECT
        j."id",
        j."title",
        j."cityId",
        j."category",
        j."featuredUntil",
        j."updatedAt",
        ts_rank_cd(j.search_vector, ${createTsQuery()}) AS rank
      FROM "Job" j
      WHERE ${JOB_BASE_WHERE}
      ${cityClause}
      ${categoryClause}
        AND j.search_vector @@ ${createTsQuery()}
      ${resolveJobSort(params.sort, true)}
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    if (ftsRows.length >= 3) {
      return { items: ftsRows, page, pageSize };
    }

    const trigramRows = await prisma.$queryRaw<JobRow[]>(Prisma.sql`
      SELECT
        j."id",
        j."title",
        j."cityId",
        j."category",
        j."featuredUntil",
        j."updatedAt",
        similarity(${JOB_TITLE_EXPRESSION}, fa_unaccent(${normalizedQuery})) AS sim
      FROM "Job" j
      WHERE ${JOB_BASE_WHERE}
      ${cityClause}
      ${categoryClause}
        AND ${JOB_TITLE_EXPRESSION} % fa_unaccent(${normalizedQuery})
        AND similarity(${JOB_TITLE_EXPRESSION}, fa_unaccent(${normalizedQuery})) >= ${SIMILARITY_THRESHOLD}
      ${resolveJobTrigramSort(params.sort)}
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    return { items: trigramRows, page, pageSize };
  }

  const rows = await prisma.$queryRaw<JobRow[]>(Prisma.sql`
    SELECT
      j."id",
      j."title",
      j."cityId",
      j."category",
      j."featuredUntil",
      j."updatedAt"
    FROM "Job" j
    WHERE ${JOB_BASE_WHERE}
    ${cityClause}
    ${categoryClause}
    ${resolveJobSort(params.sort, false)}
    LIMIT ${pageSize} OFFSET ${offset}
  `);

  return { items: rows, page, pageSize };
}

function resolveJobTrigramSort(sort: JobSearchSort | undefined): Prisma.Sql {
  switch (sort) {
    case "featured":
      return Prisma.sql`ORDER BY (j."featuredUntil" IS NOT NULL) DESC, j."featuredUntil" DESC, j."updatedAt" DESC`;
    case "expiry":
      return Prisma.sql`ORDER BY j."featuredUntil" ASC NULLS LAST, j."updatedAt" DESC`;
    case "newest":
      return Prisma.sql`ORDER BY j."updatedAt" DESC`;
    case "relevance":
    default:
      return Prisma.sql`ORDER BY sim DESC, j."updatedAt" DESC`;
  }
}
