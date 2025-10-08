import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hashKey } from "../util";

const cacheCalls: { keys?: string[]; options?: unknown }[] = [];

const unstableCacheMock = vi.hoisted(() => ({
  unstable_cache: vi.fn((resolver: (...args: unknown[]) => unknown, keys?: string[], options?: unknown) => {
    cacheCalls.push({ keys, options });
    return resolver;
  }),
}));

const runProfileSearchMock = vi.hoisted(() => vi.fn());
const runJobSearchMock = vi.hoisted(() => vi.fn());
const buildCanonicalMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => unstableCacheMock);
vi.mock("@/lib/search/runProfileSearch", () => ({
  runProfileSearch: runProfileSearchMock,
}));
vi.mock("@/lib/search/runJobSearch", () => ({
  runJobSearch: runJobSearchMock,
}));
vi.mock("@/lib/seo/canonical", () => ({
  buildCanonical: buildCanonicalMock,
}));

describe("search orchestrators", () => {
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    cacheCalls.length = 0;
    runProfileSearchMock.mockReset();
    runJobSearchMock.mockReset();
    buildCanonicalMock.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("clamps invalid profile sort while still executing the search", async () => {
    runProfileSearchMock.mockResolvedValue({
      items: [{ id: "p1" }],
      page: 1,
      pageSize: 12,
    });
    buildCanonicalMock.mockReturnValue("profiles-canonical");

    const { fetchProfilesOrchestrated } = await import("../profiles");

    const result = await fetchProfilesOrchestrated({ query: "singer", sort: "invalid", page: 0 });

    expect(runProfileSearchMock).toHaveBeenCalledTimes(1);
    const params = runProfileSearchMock.mock.calls[0]?.[0];
    expect(params).toMatchObject({ query: "singer", page: 1 });
    expect(params?.sort).toBeUndefined();

    expect(result.items).toHaveLength(1);
    expect(result.appliedFilters).toEqual([{ key: "query", value: "singer" }]);
    expect(result.canonical).toBe("profiles-canonical");

    expect(buildCanonicalMock).toHaveBeenCalledWith(
      "/profiles",
      expect.objectContaining({ query: "singer", page: 1 }),
    );
    expect(buildCanonicalMock.mock.calls[0]?.[1]).not.toHaveProperty("sort");

    const expectedHash = hashKey({ query: "singer", page: 1 });
    expect(cacheCalls[0]?.keys).toEqual(["search:profiles", expectedHash]);
    expect(cacheCalls[0]?.options).toMatchObject({
      revalidate: 60,
      tags: ["search:profiles", `search:profiles:${expectedHash}`],
    });
  });

  it("produces canonical jobs URL with normalized params", async () => {
    runJobSearchMock.mockResolvedValue({
      items: [
        { id: "job1" },
        { id: "job2" },
      ],
      page: 2,
      pageSize: 12,
    });
    buildCanonicalMock.mockReturnValue("jobs-canonical");

    const { fetchJobsOrchestrated } = await import("../jobs");

    const result = await fetchJobsOrchestrated({
      query: "actor",
      category: "casting",
      sort: "featured",
      page: "2",
    });

    expect(runJobSearchMock).toHaveBeenCalledWith({
      query: "actor",
      city: undefined,
      category: "casting",
      sort: "featured",
      page: 2,
    });

    expect(result.page).toBe(2);
    expect(result.appliedFilters).toEqual([
      { key: "category", value: "casting" },
      { key: "sort", value: "featured" },
      { key: "query", value: "actor" },
    ]);
    expect(result.canonical).toBe("jobs-canonical");

    expect(buildCanonicalMock).toHaveBeenCalledWith(
      "/jobs",
      expect.objectContaining({ category: "casting", sort: "featured", page: 2 }),
    );

    const expectedHash = hashKey({
      query: "actor",
      category: "casting",
      sort: "featured",
      page: 2,
    });
    expect(cacheCalls[0]?.keys).toEqual(["search:jobs", expectedHash]);
    expect(cacheCalls[0]?.options).toMatchObject({
      tags: ["search:jobs", `search:jobs:${expectedHash}`],
    });
  });

  it("falls back to defaults when inputs are unusable", async () => {
    runProfileSearchMock.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 12,
    });
    buildCanonicalMock.mockReturnValue("profiles-default");

    const { fetchProfilesOrchestrated } = await import("../profiles");

    const result = await fetchProfilesOrchestrated({ page: "-5", sort: 123 } as unknown as URLSearchParams);

    expect(runProfileSearchMock).toHaveBeenCalledWith({
      query: undefined,
      city: undefined,
      skills: undefined,
      sort: undefined,
      page: 1,
    });
    expect(result.page).toBe(1);
    expect(result.appliedFilters).toEqual([]);
    expect(buildCanonicalMock).toHaveBeenLastCalledWith("/profiles", expect.objectContaining({ page: 1 }));
  });

  afterAll(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
