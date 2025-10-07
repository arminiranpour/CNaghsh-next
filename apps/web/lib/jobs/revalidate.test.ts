import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CACHE_TAGS } from "@/lib/cache/config";

const prismaMock = vi.hoisted(() => ({
  job: {
    findUnique: vi.fn(),
  },
}));

const revalidateTagMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
  revalidatePath: revalidatePathMock,
}));

describe("job revalidation", () => {
  beforeEach(() => {
    prismaMock.job.findUnique.mockResolvedValue({
      cityId: "tehran",
      category: "ENGINEERING",
      remote: true,
      payType: "FULL_TIME",
    });
    revalidateTagMock.mockClear();
    revalidatePathMock.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("returns all relevant cache tags", async () => {
    const { getJobTags } = await import("./revalidate");

    const tags = await getJobTags("job1");

    expect(tags).toEqual(
      expect.arrayContaining([
        CACHE_TAGS.jobDetail("job1"),
        CACHE_TAGS.jobsListCity("tehran"),
        CACHE_TAGS.jobsListCategory("ENGINEERING"),
        CACHE_TAGS.jobsListRemote(true),
        CACHE_TAGS.jobsListPayType("FULL_TIME"),
      ]),
    );
  });

  it("revalidates tags and dashboard path", async () => {
    const { revalidateJobRelatedPaths } = await import("./revalidate");

    await revalidateJobRelatedPaths("job1");

    expect(revalidateTagMock).toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/jobs");
  });
});
