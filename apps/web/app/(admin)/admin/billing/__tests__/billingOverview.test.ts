import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { Prisma } from "@prisma/client";

describe("admin billing overview", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty metrics when the database is unreachable", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const prismaError = new Prisma.PrismaClientKnownRequestError("database unreachable", {
      code: "P1001",
      clientVersion: "test",
    });

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        subscription: { count: vi.fn().mockRejectedValue(prismaError) },
        payment: { count: vi.fn().mockResolvedValue(0) },
        invoice: { count: vi.fn().mockResolvedValue(0) },
      },
    }));

    const { getOverview } = await import("../page");

    await expect(getOverview()).resolves.toEqual({
      activeSubscriptions: 0,
      totalPayments: 0,
      refundedPayments: 0,
      refundInvoices: 0,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "[admin][billing] Database unavailable, showing empty overview.",
      prismaError.message,
    );
  });
});
