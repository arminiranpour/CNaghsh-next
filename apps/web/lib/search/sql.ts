import { Prisma } from "@prisma/client";

type PaginationInput = {
  page?: number;
  pageSize?: number;
  defaultPageSize?: number;
};

export const DEFAULT_PAGE_SIZE = 12;
export const SIMILARITY_THRESHOLD = 0.3;

export function buildTsQuery(query: string): Prisma.Sql {
  const normalized = query.trim();

  if (!normalized) {
    throw new Error("Query must not be empty");
  }

  return Prisma.sql`plainto_tsquery('simple', fa_unaccent(${normalized}))`;
}

export function buildUnaccentText(value: string): Prisma.Sql {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("Value must not be empty");
  }

  return Prisma.sql`fa_unaccent(${normalized})`;
}

export function resolvePagination({
  page,
  pageSize,
  defaultPageSize = DEFAULT_PAGE_SIZE,
}: PaginationInput) {
  const size = Math.max(1, pageSize ?? defaultPageSize);
  const currentPage = Math.max(1, page ?? 1);
  const offset = (currentPage - 1) * size;

  return { page: currentPage, pageSize: size, offset };
}

type ProfileSort = "relevance" | "newest" | "alpha" | undefined;
type JobSort = "relevance" | "newest" | "featured" | "expiry" | undefined;

export function resolveProfileSort(sort: ProfileSort, hasQuery: boolean): Prisma.Sql {
  if (hasQuery) {
    switch (sort) {
      case "alpha":
        return Prisma.sql`ORDER BY coalesce(p."stageName",'') || ' ' || coalesce(p."firstName",'') || ' ' || coalesce(p."lastName",'') ASC`;
      case "newest":
        return Prisma.sql`ORDER BY p."updatedAt" DESC`;
      default:
        return Prisma.sql`ORDER BY rank DESC, p."updatedAt" DESC`;
    }
  }

  if (sort === "alpha") {
    return Prisma.sql`ORDER BY coalesce(p."stageName",'') || ' ' || coalesce(p."firstName",'') || ' ' || coalesce(p."lastName",'') ASC`;
  }

  return Prisma.sql`ORDER BY p."updatedAt" DESC`;
}

export function resolveJobSort(sort: JobSort, hasQuery: boolean): Prisma.Sql {
  if (hasQuery) {
    switch (sort) {
      case "featured":
        return Prisma.sql`ORDER BY (j."featuredUntil" IS NOT NULL) DESC, j."featuredUntil" DESC, j."updatedAt" DESC`;
      case "expiry":
        return Prisma.sql`ORDER BY j."featuredUntil" ASC NULLS LAST, j."updatedAt" DESC`;
      case "newest":
        return Prisma.sql`ORDER BY j."updatedAt" DESC`;
      default:
        return Prisma.sql`ORDER BY rank DESC, j."updatedAt" DESC`;
    }
  }

  switch (sort) {
    case "featured":
      return Prisma.sql`ORDER BY (j."featuredUntil" IS NOT NULL) DESC, j."featuredUntil" DESC, j."updatedAt" DESC`;
    case "expiry":
      return Prisma.sql`ORDER BY j."featuredUntil" ASC NULLS LAST, j."updatedAt" DESC`;
    case "newest":
    case "relevance":
    case undefined:
      return Prisma.sql`ORDER BY j."updatedAt" DESC`;
  }
}
