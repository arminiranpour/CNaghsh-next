import { SubscriptionStatus } from "@prisma/client";
import { describe, expect, it, vi, beforeEach } from "vitest";

const emitReminderMock = vi.fn();
vi.mock("./events", () => ({ emitBillingExpiryReminder: emitReminderMock }));

const prismaMock = {
  subscription: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/url", () => ({ buildAbsoluteUrl: (path: string) => `https://example.com${path}` }));

describe("subscription expiry reminders", () => {
  beforeEach(() => {
    emitReminderMock.mockReset();
    prismaMock.subscription.findMany.mockReset();
  });

  it("queues reminders for subscriptions ending in three days", async () => {
    const { queueSubscriptionExpiryReminders } = await import("./reminders");

    const referenceDate = new Date("2024-06-01T00:00:00.000Z");
    const threeDaysLater = new Date(referenceDate.getTime() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000);

    prismaMock.subscription.findMany.mockResolvedValue([
      { id: "sub-1", userId: "user-1", endsAt: threeDaysLater },
      { id: "sub-2", userId: "user-2", endsAt: new Date(threeDaysLater.getTime() + 1000) },
    ]);

    const count = await queueSubscriptionExpiryReminders(referenceDate);

    expect(count).toBe(2);
    expect(prismaMock.subscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: [SubscriptionStatus.active, SubscriptionStatus.renewing] },
          cancelAtPeriodEnd: false,
        }),
      }),
    );
    expect(emitReminderMock).toHaveBeenCalledTimes(2);
    expect(emitReminderMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: "user-1",
        subscriptionId: "sub-1",
        renewUrl: "https://example.com/dashboard/billing",
      }),
    );
  });
});
