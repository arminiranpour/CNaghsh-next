"use server";

import { Prisma, type JobModeration, type JobStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const JOB_LIST_SELECT = {
  id: true,
  title: true,
  status: true,
  moderation: true,
  featuredUntil: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.JobSelect;

export type JobsAdminListFilters = {
  moderation?: JobModeration;
  status?: JobStatus;
  featured?: "ONLY" | "NONE";
  userQuery?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export type PaginationOptions = {
  page: number;
  pageSize: number;
};

export async function listJobsForAdmin(
  filters: JobsAdminListFilters,
  pagination: PaginationOptions,
) {
  const conditions: Prisma.JobWhereInput[] = [];
  const now = new Date();

  if (filters.moderation) {
    conditions.push({ moderation: filters.moderation });
  }

  if (filters.status) {
    conditions.push({ status: filters.status });
  }

  if (filters.featured === "ONLY") {
    conditions.push({ featuredUntil: { gt: now } });
  } else if (filters.featured === "NONE") {
    conditions.push({
      OR: [
        { featuredUntil: null },
        { featuredUntil: { lte: now } },
      ],
    });
  }

  if (filters.userQuery) {
    const query = filters.userQuery.trim();
    if (query.length > 0) {
      conditions.push({
        user: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
      });
    }
  }

  if (filters.search) {
    const search = filters.search.trim();
    if (search.length > 0) {
      conditions.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      });
    }
  }

  if (filters.dateFrom) {
    conditions.push({ createdAt: { gte: filters.dateFrom } });
  }

  if (filters.dateTo) {
    conditions.push({ createdAt: { lte: filters.dateTo } });
  }

  const where: Prisma.JobWhereInput | undefined = conditions.length
    ? { AND: conditions }
    : undefined;

  const page = Math.max(1, pagination.page);
  const pageSize = Math.max(1, pagination.pageSize);
  const skip = (page - 1) * pageSize;

  const [items, total] = await prisma.$transaction([
    prisma.job.findMany({
      where,
      select: JOB_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.job.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
  };
}
