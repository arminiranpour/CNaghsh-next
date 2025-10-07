import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = {
  value: new Map<string, string>(),
  get: vi.fn((name: string) => {
    const value = cookieStore.value.get(name);
    return value ? { name, value } : undefined;
  }),
  set: vi.fn(({ name, value }: { name: string; value: string }) => {
    cookieStore.value.set(name, value);
  }),
};

const prismaMock = {
  job: {
    update: vi.fn().mockResolvedValue(undefined),
  },
};

vi.mock("next/headers", () => ({
  cookies: () => cookieStore,
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

describe("incrementJobViews", () => {
  beforeEach(() => {
    cookieStore.value.clear();
    cookieStore.get.mockClear();
    cookieStore.set.mockClear();
    prismaMock.job.update.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-01T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces repeated views within 30 minutes", async () => {
    const { incrementJobViews } = await import("./views");

    await incrementJobViews("job123");
    await incrementJobViews("job123");

    expect(prismaMock.job.update).toHaveBeenCalledTimes(1);
  });

  it("increments again after debounce window", async () => {
    const { incrementJobViews } = await import("./views");

    await incrementJobViews("job123");
    vi.advanceTimersByTime(31 * 60 * 1000);
    await incrementJobViews("job123");

    expect(prismaMock.job.update).toHaveBeenCalledTimes(2);
  });
});
