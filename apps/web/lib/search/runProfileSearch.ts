import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  DEFAULT_PAGE_SIZE,
  SIMILARITY_THRESHOLD,
  buildTsQuery,
  resolvePagination,
  resolveProfileSort,
} from "./sql";

type ProfileSearchSort = "relevance" | "newest" | "alpha";

export type ProfileSearchParams = {
  query?: string;
  city?: string;
  skills?: string[];
  page?: number;
  pageSize?: number;
  sort?: ProfileSearchSort;
};

type ProfileRow = {
  id: string;
  stageName: string | null;
  firstName: string | null;
  lastName: string | null;
  cityId: string | null;
  rank?: number | null;
  sim?: number | null;
};

type SearchResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
};

const PROFILE_BASE_WHERE = Prisma.sql`
  p."visibility" = 'PUBLIC'
  AND p."moderationStatus" = 'APPROVED'
`;

const PROFILE_NAME_EXPRESSION = Prisma.sql`
  coalesce(p."stageName",'') || ' ' || coalesce(p."firstName",'') || ' ' || coalesce(p."lastName",'')
`;

export async function runProfileSearch(
  params: ProfileSearchParams,
): Promise<SearchResult<ProfileRow>> {
  const { page, pageSize, offset } = resolvePagination({
    page: params.page,
    pageSize: params.pageSize,
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });

  const cityClause = params.city
    ? Prisma.sql`AND p."cityId" = ${params.city}`
    : Prisma.sql``;

  const skillsClause = params.skills && params.skills.length > 0
    ? Prisma.sql`
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(p."skills"::jsonb, '[]'::jsonb)) skill(value)
          WHERE skill.value = ANY(${params.skills})
        )
      `
    : Prisma.sql``;

  const hasQuery = Boolean(params.query && params.query.trim().length > 0);

  if (hasQuery && params.query) {
    const normalizedQuery = params.query.trim();
    const tsQuery = buildTsQuery(normalizedQuery);

    const ftsRows = await prisma.$queryRaw<ProfileRow[]>(Prisma.sql`
      SELECT
        p."id",
        p."stageName",
        p."firstName",
        p."lastName",
        p."cityId",
        ts_rank_cd(p.search_vector, ${tsQuery}) AS rank
      FROM "Profile" p
      WHERE ${PROFILE_BASE_WHERE}
      ${cityClause}
      ${skillsClause}
        AND p.search_vector @@ ${tsQuery}
      ${resolveProfileSort(params.sort, true)}
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    if (ftsRows.length >= 3) {
      return { items: ftsRows, page, pageSize };
    }

    const trigramRows = await prisma.$queryRaw<ProfileRow[]>(Prisma.sql`
      SELECT
        p."id",
        p."stageName",
        p."firstName",
        p."lastName",
        p."cityId",
        similarity(${PROFILE_NAME_EXPRESSION}, fa_unaccent(${normalizedQuery})) AS sim
      FROM "Profile" p
      WHERE ${PROFILE_BASE_WHERE}
      ${cityClause}
      ${skillsClause}
        AND ${PROFILE_NAME_EXPRESSION} % fa_unaccent(${normalizedQuery})
        AND similarity(${PROFILE_NAME_EXPRESSION}, fa_unaccent(${normalizedQuery})) >= ${SIMILARITY_THRESHOLD}
      ${resolveTrigramSort(params.sort)}
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    return { items: trigramRows, page, pageSize };
  }

  const rows = await prisma.$queryRaw<ProfileRow[]>(Prisma.sql`
    SELECT
      p."id",
      p."stageName",
      p."firstName",
      p."lastName",
      p."cityId"
    FROM "Profile" p
    WHERE ${PROFILE_BASE_WHERE}
    ${cityClause}
    ${skillsClause}
    ${resolveProfileSort(params.sort, false)}
    LIMIT ${pageSize} OFFSET ${offset}
  `);

  return { items: rows, page, pageSize };
}

function resolveTrigramSort(sort: ProfileSearchSort | undefined): Prisma.Sql {
  switch (sort) {
    case "alpha":
      return Prisma.sql`ORDER BY ${PROFILE_NAME_EXPRESSION} ASC`;
    case "newest":
      return Prisma.sql`ORDER BY p."updatedAt" DESC`;
    case "relevance":
    default:
      return Prisma.sql`ORDER BY sim DESC, p."updatedAt" DESC`;
  }
}
