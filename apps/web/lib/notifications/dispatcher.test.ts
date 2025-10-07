import { NotificationChannel, NotificationType } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  notification: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}));

const emailMock = vi.hoisted(() => ({
  isEmailConfigured: vi.fn(() => false),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("./email", () => emailMock);

describe("notification dispatcher", () => {
  beforeEach(() => {
    prismaMock.notification.findFirst.mockReset();
    prismaMock.notification.create.mockReset();
    emailMock.isEmailConfigured.mockReturnValue(false);
    emailMock.sendEmail.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-10T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("stores an in-app notification and emits instrumentation", async () => {
    const { notifyOnce, setNotificationDispatchObserver } = await import("./dispatcher");

    prismaMock.notification.findFirst.mockResolvedValue(null);
    prismaMock.notification.create.mockResolvedValue({ id: "n1" });

    const events: string[] = [];
    setNotificationDispatchObserver((event) => {
      events.push(event.status);
      expect(event.dedupeHash).toMatch(/[a-f0-9]{64}/);
      expect(event.channels).toEqual([NotificationChannel.IN_APP]);
    });

    await notifyOnce({
      userId: "user1",
      type: NotificationType.MODERATION_APPROVED,
      title: "Approved",
      body: "Your job is approved",
      payload: { context: "job", jobId: "job1" },
    });

    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user1",
          channel: NotificationChannel.IN_APP,
        }),
      }),
    );
    expect(events).toEqual(["delivered"]);
  });

  it("deduplicates notifications within the time window", async () => {
    const { notifyOnce } = await import("./dispatcher");

    prismaMock.notification.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "existing" });

    prismaMock.notification.create.mockResolvedValue({ id: "new" });

    await notifyOnce({
      userId: "user2",
      type: NotificationType.MODERATION_PENDING,
      title: "Pending",
      body: "Job pending",
      payload: { context: "job", jobId: "job2" },
    });

    await notifyOnce({
      userId: "user2",
      type: NotificationType.MODERATION_PENDING,
      title: "Pending",
      body: "Job pending",
      payload: { context: "job", jobId: "job2" },
    });

    expect(prismaMock.notification.create).toHaveBeenCalledTimes(1);
  });

  it("sends email when configured", async () => {
    const { notifyOnce } = await import("./dispatcher");

    prismaMock.notification.findFirst.mockResolvedValue(null);
    prismaMock.notification.create.mockResolvedValue({ id: "n2" });
    emailMock.isEmailConfigured.mockReturnValue(true);

    await notifyOnce({
      userId: "user3",
      type: NotificationType.MODERATION_PENDING,
      title: "Pending",
      body: "Job pending",
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    });

    expect(emailMock.sendEmail).toHaveBeenCalledWith("user3", "Pending", "Job pending");
  });
});
