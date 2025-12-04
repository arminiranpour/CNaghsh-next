import { Prisma } from "@prisma/client";

import { LANGUAGE_OPTIONS } from "@/lib/profile/languages";

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
  gender?: string[];
  educationLevels?: string[];
  languages?: string[];
  accents?: string[];
  birthDateFrom?: Date;
  birthDateTo?: Date;
  ageRange?: { min?: number; max?: number };
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
  skills: Prisma.JsonValue | null;
  age: number | null;
  avatarUrl: string | null;
  updatedAt: Date;
  rank?: number | null;
  sim?: number | null;
};

type ProfileColumnSupport = {
  hasGender: boolean;
  hasEducationLevel: boolean;
  hasBirthDate: boolean;
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

const PROFILE_NAME_EXPRESSION = Prisma.sql`(
  coalesce(p."stageName",'') ||
  ' ' ||
  coalesce(p."firstName",'') ||
  ' ' ||
  coalesce(p."lastName",'')
)`;

const LANGUAGE_LOOKUP = new Map(
  LANGUAGE_OPTIONS.map((item) => [item.key.toLowerCase(), item.label.toLowerCase()] as const),
);

let profileColumnSupportCache: ProfileColumnSupport | null = null;

export async function runProfileSearch(
  params: ProfileSearchParams,
): Promise<SearchResult<ProfileRow>> {
  const { page, pageSize, offset } = resolvePagination({
    page: params.page,
    pageSize: params.pageSize,
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });

  const columnSupport = await getProfileColumnSupport();
  const filtersClause = buildFilterClauses(params, columnSupport);

  const hasQuery = Boolean(params.query && params.query.trim().length > 0);

  if (hasQuery && params.query) {
    const normalizedQuery = params.query.trim();
    const createTsQuery = () => buildTsQuery(normalizedQuery);

    const ftsRows = await prisma.$queryRaw<ProfileRow[]>(Prisma.sql`
      SELECT
        p."id",
        p."stageName",
        p."firstName",
        p."lastName",
        p."cityId",
        p."skills",
        p."age",
        p."avatarUrl",
        p."updatedAt",
        ts_rank_cd(p.search_vector, ${createTsQuery()}) AS rank
      FROM "Profile" p
      WHERE ${PROFILE_BASE_WHERE}
      ${filtersClause}
        AND p.search_vector @@ ${createTsQuery()}
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
        p."skills",
        p."age",
        p."avatarUrl",
        p."updatedAt",
        similarity(${PROFILE_NAME_EXPRESSION}, fa_unaccent(${normalizedQuery})) AS sim
      FROM "Profile" p
      WHERE ${PROFILE_BASE_WHERE}
      ${filtersClause}
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
      p."cityId",
      p."skills",
      p."age",
      p."avatarUrl",
      p."updatedAt"
    FROM "Profile" p
    WHERE ${PROFILE_BASE_WHERE}
    ${filtersClause}
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

async function getProfileColumnSupport(): Promise<ProfileColumnSupport> {
  if (profileColumnSupportCache) {
    return profileColumnSupportCache;
  }

  const rows = await prisma.$queryRaw<{ column_name: string }[]>(Prisma.sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE lower(table_name) = 'profile'
      AND table_schema = 'public'
  `);

  const columnSet = new Set(rows.map((row) => row.column_name.toLowerCase()));

  profileColumnSupportCache = {
    hasGender: columnSet.has("gender"),
    hasEducationLevel: columnSet.has("educationlevel"),
    hasBirthDate: columnSet.has("birthdate"),
  };

  return profileColumnSupportCache;
}

function buildFilterClauses(
  params: ProfileSearchParams,
  support: ProfileColumnSupport,
): Prisma.Sql {
  const clauses: Prisma.Sql[] = [];

  if (params.city) {
    clauses.push(Prisma.sql`AND p."cityId" = ${params.city}`);
  }

  if (params.skills?.length) {
    const skills = Array.from(new Set(params.skills));
    clauses.push(Prisma.sql`
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(COALESCE(p."skills"::jsonb, '[]'::jsonb)) skill(value)
        WHERE skill.value = ANY(${skills})
      )
    `);
  }

  if (params.gender?.length && support.hasGender) {
    clauses.push(Prisma.sql`AND p."gender" = ANY(${params.gender})`);
  }

  if (params.educationLevels?.length && support.hasEducationLevel) {
    clauses.push(Prisma.sql`AND p."educationLevel" = ANY(${params.educationLevels})`);
  }

  const ageClause = buildAgeClause(params, support);
  if (ageClause) {
    clauses.push(ageClause);
  }

  const languageClause = buildLanguageClause(params.languages);
  if (languageClause) {
    clauses.push(languageClause);
  }

  const accentClause = buildAccentClause(params.accents);
  if (accentClause) {
    clauses.push(accentClause);
  }

  if (!clauses.length) {
    return Prisma.sql``;
  }

  return Prisma.sql`${Prisma.join(clauses, "\n")}`;
}

function buildAgeClause(
  params: ProfileSearchParams,
  support: ProfileColumnSupport,
): Prisma.Sql | null {
  if (!support.hasBirthDate) {
    return null;
  }

  const hasBirthRange = params.birthDateFrom || params.birthDateTo;
  if (!hasBirthRange) {
    return null;
  }

  const birthConditions: Prisma.Sql[] = [];
  if (params.birthDateFrom) {
    birthConditions.push(Prisma.sql`p."birthDate" >= ${params.birthDateFrom}`);
  }
  if (params.birthDateTo) {
    birthConditions.push(Prisma.sql`p."birthDate" <= ${params.birthDateTo}`);
  }
  const birthClause = birthConditions.length
    ? Prisma.sql` AND ${Prisma.join(birthConditions, " AND ")}`
    : Prisma.sql``;

  const ageConditions: Prisma.Sql[] = [];
  if (params.ageRange?.min !== undefined) {
    ageConditions.push(Prisma.sql`p."age" >= ${params.ageRange.min}`);
  }
  if (params.ageRange?.max !== undefined) {
    ageConditions.push(Prisma.sql`p."age" <= ${params.ageRange.max}`);
  }
  const ageFallback = ageConditions.length
    ? Prisma.sql` AND ${Prisma.join(ageConditions, " AND ")}`
    : null;

  if (ageFallback) {
    return Prisma.sql`
      AND (
        (p."birthDate" IS NOT NULL${birthClause})
        OR (p."birthDate" IS NULL${ageFallback})
      )
    `;
  }

  return Prisma.sql`AND p."birthDate" IS NOT NULL${birthClause}`;
}

function buildLanguageClause(languages: string[] | undefined): Prisma.Sql | null {
  if (!languages || languages.length === 0) {
    return null;
  }

  const normalized = dedupeLower(expandLanguages(languages));
  if (!normalized.length) {
    return null;
  }

  return Prisma.sql`
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(p."languages"::jsonb, '[]'::jsonb)) lang(value)
      WHERE (
        (jsonb_typeof(lang.value) = 'object' AND lower(coalesce(lang.value->>'label','')) = ANY(${normalized}))
        OR (jsonb_typeof(lang.value) = 'object' AND lower(coalesce(lang.value->>'key','')) = ANY(${normalized}))
        OR (jsonb_typeof(lang.value) = 'string' AND lower(lang.value #>> '{}') = ANY(${normalized}))
      )
    )
  `;
}

function buildAccentClause(accents: string[] | undefined): Prisma.Sql | null {
  if (!accents || accents.length === 0) {
    return null;
  }

  const normalized = dedupeLower(accents);
  if (!normalized.length) {
    return null;
  }

  return Prisma.sql`
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(p."accents"::jsonb, '[]'::jsonb)) accent(value)
      WHERE lower(accent.value) = ANY(${normalized})
    )
  `;
}

function dedupeLower(values: string[]): string[] {
  const set = new Set<string>();
  const cleaned: string[] = [];

  for (const value of values) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || set.has(normalized)) {
      continue;
    }
    set.add(normalized);
    cleaned.push(normalized);
  }

  return cleaned;
}

function expandLanguages(values: string[]): string[] {
  const expanded: string[] = [];

  for (const value of values) {
    expanded.push(value);
    const lookupKey = value.trim().toLowerCase();
    const mapped = LANGUAGE_LOOKUP.get(lookupKey);
    if (mapped) {
      expanded.push(mapped);
    }
  }

  return expanded;
}
