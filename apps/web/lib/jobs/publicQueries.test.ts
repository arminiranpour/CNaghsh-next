import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { CACHE_TAGS } from "@/lib/cache/config";
import { PUBLIC_JOBS_PAGE_SIZE } from "@/lib/jobs/constants";

const mockPrisma = vi.hoisted(() => ({
  job: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}));

const cacheCalls: { keys: string[]; options?: unknown }[] = [];

const mockCache = vi.hoisted(() => ({
  unstable_cache: vi.fn((resolver: (...args: unknown[]) => unknown, keys: string[], options?: unknown) => {
    cacheCalls.push({ keys, options });
    return resolver;
  }),
}));

vi.mock("next/cache", () => mockCache);

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("public job queries", () => {
  beforeEach(() => {
    cacheCalls.length = 0;
    mockPrisma.job.findMany.mockResolvedValue([]);
    mockPrisma.job.count.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("enforces approved & published visibility", async () => {
    const { getPublicJobs, buildPublicWhere } = await import("./publicQueries");
    await getPublicJobs({ city: "tehran", category: "ENGINEERING", remote: true, payType: "FULL_TIME" });

    const where = buildPublicWhere({ city: "tehran", category: "ENGINEERING", remote: true, payType: "FULL_TIME" });

    expect(where).toMatchObject({
      status: "PUBLISHED",
      moderation: "APPROVED",
      cityId: "tehran",
      category: "ENGINEERING",
      remote: true,
      payType: "FULL_TIME",
    });

    expect(mockPrisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: PUBLIC_JOBS_PAGE_SIZE,
      }),
    );
  });

  it("supports pagination & sort specific cache tags", async () => {
    const { getPublicJobs, buildPublicOrderBy } = await import("./publicQueries");

    mockPrisma.job.findMany.mockResolvedValue([
      { id: "job1" },
    ]);
    mockPrisma.job.count.mockResolvedValue(25);

    const result = await getPublicJobs({ sort: "featured", page: 2, remote: true });

    expect(result.page).toBe(2);
    expect(result.totalPages).toBeGreaterThan(1);

    expect(mockPrisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { featuredUntil: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        skip: PUBLIC_JOBS_PAGE_SIZE,
      }),
    );

    expect(buildPublicOrderBy("expiring")).toEqual([
      { featuredUntil: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
    ]);

    expect(cacheCalls[0]?.options).toMatchObject({
      tags: expect.arrayContaining([
        CACHE_TAGS.jobsList,
        CACHE_TAGS.jobsListRemote(true),
        CACHE_TAGS.jobsListSort("featured"),
      ]),
    });
  });

  it("collects filters with shared cache tag", async () => {
    const { getPublicJobFilters } = await import("./publicQueries");

    mockPrisma.job.findMany
      .mockResolvedValueOnce([
        { category: "DESIGN" },
        { category: "ENGINEERING" },
      ])
      .mockResolvedValueOnce([
        { payType: "FULL_TIME" },
        { payType: "PART_TIME" },
      ]);

    const filters = await getPublicJobFilters();

    expect(filters.categories).toEqual(["DESIGN", "ENGINEERING"]);
    expect(filters.payTypes).toEqual(["FULL_TIME", "PART_TIME"]);

    expect(cacheCalls.pop()?.options).toMatchObject({
      tags: expect.arrayContaining([CACHE_TAGS.jobsFilters, CACHE_TAGS.jobsList]),
    });
  });
});
