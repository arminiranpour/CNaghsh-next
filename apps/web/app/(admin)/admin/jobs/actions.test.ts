import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const approveJobAdminMock = vi.hoisted(() => vi.fn());
const rejectJobAdminMock = vi.hoisted(() => vi.fn());
const featureJobAdminMock = vi.hoisted(() => vi.fn());
const suspendJobAdminMock = vi.hoisted(() => vi.fn());
const closeJobAdminMock = vi.hoisted(() => vi.fn());

const revalidatePathMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() => vi.fn(() => {
  throw new Error("NOT_FOUND");
}));

vi.mock("@/lib/auth/session", () => ({
  getServerAuthSession: getSessionMock,
}));

vi.mock("@/lib/jobs/admin/approveJob", () => ({
  approveJobAdmin: approveJobAdminMock,
}));

vi.mock("@/lib/jobs/admin/rejectJob", () => ({
  rejectJobAdmin: rejectJobAdminMock,
}));

vi.mock("@/lib/jobs/admin/featureJob", () => ({
  featureJobAdmin: featureJobAdminMock,
}));

vi.mock("@/lib/jobs/admin/suspendJob", () => ({
  suspendJobAdmin: suspendJobAdminMock,
}));

vi.mock("@/lib/jobs/admin/closeJobAdmin", () => ({
  closeJobByAdmin: closeJobAdminMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

describe("admin job server actions", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    approveJobAdminMock.mockReset();
    rejectJobAdminMock.mockReset();
    featureJobAdminMock.mockReset();
    suspendJobAdminMock.mockReset();
    closeJobAdminMock.mockReset();
    revalidatePathMock.mockReset();
    notFoundMock.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("denies anonymous users", async () => {
    getSessionMock.mockResolvedValue(null);
    const { approveJobAction } = await import("./actions");

    const result = await approveJobAction("job123");

    expect(result).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("denies non-admin users", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user1", role: "USER" } });
    const { rejectJobAction } = await import("./actions");

    const result = await rejectJobAction("job123", "invalid");

    expect(result).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("validates identifiers before calling admin services", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    const { approveJobAction } = await import("./actions");

    const result = await approveJobAction("invalid-id");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("شناسه");
    expect(approveJobAdminMock).not.toHaveBeenCalled();
  });

  it("invokes admin operations when authorized", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    approveJobAdminMock.mockResolvedValue({});
    const { approveJobAction } = await import("./actions");

    const jobId = "ckuzx0s2c0000u7d2x7v4a5y6";
    const result = await approveJobAction(jobId);

    expect(result).toEqual({ ok: true });
    expect(approveJobAdminMock).toHaveBeenCalledWith(jobId, "admin1");
  });

  it("rate limits feature commands", async () => {
    vi.useFakeTimers();
    try {
      getSessionMock.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
      featureJobAdminMock.mockResolvedValue({});
      const { featureJobAction } = await import("./actions");
      const jobId = "ckuzx0s2c0000u7d2x7v4a5y6";

      for (let i = 0; i < 5; i += 1) {
        const result = await featureJobAction(jobId, { type: "CLEAR" });
        expect(result).toEqual({ ok: true });
      }

      const limited = await featureJobAction(jobId, { type: "CLEAR" });
      expect(limited.ok).toBe(false);
      expect(limited.error).toContain("تعداد درخواست‌ها زیاد است");

      vi.advanceTimersByTime(61 * 1000);
      const reset = await featureJobAction(jobId, { type: "CLEAR" });
      expect(reset).toEqual({ ok: true });
    } finally {
      vi.useRealTimers();
    }
  });
});
