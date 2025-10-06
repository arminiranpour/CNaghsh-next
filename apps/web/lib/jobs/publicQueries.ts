import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const PUBLIC_JOBS_PAGE_SIZE = 12;

export type PublicJobSort = "newest" | "featured" | "expiring";

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
  const page = Math.max(params.page ?? 1, 1);
  const skip = (page - 1) * PUBLIC_JOBS_PAGE_SIZE;

  const where = buildPublicWhere({
    city: params.city,
    category: params.category,
    remote: params.remote,
    payType: params.payType,
  });

  const orderBy = buildPublicOrderBy(params.sort);

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
    page,
    pageSize: PUBLIC_JOBS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PUBLIC_JOBS_PAGE_SIZE)),
  };
}

export async function getPublicJobById(id: string) {
  if (!id) {
    return null;
  }

  return prisma.job.findFirst({
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
}

export async function getPublicJobFilters() {
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
}
