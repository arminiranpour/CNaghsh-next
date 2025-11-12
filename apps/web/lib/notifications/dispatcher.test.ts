import {
  NotificationCategory,
  NotificationChannel,
  NotificationDispatchStatus,
  NotificationType,
} from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createLogMock = vi.fn();
const prismaMock = {
  notificationMessageLog: {
    create: createLogMock,
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const enqueueJobMock = vi.fn();
vi.mock("./jobs", () => ({ enqueueJob: enqueueJobMock }));

const preferencesMock = {
  isChannelEnabled: vi.fn(),
  buildManagePreferencesLink: vi.fn(() => "https://example.com/manage"),
  resolveCategoryForType: vi.fn(() => NotificationCategory.BILLING_TRANSACTIONAL),
};

vi.mock("./preferences", () => preferencesMock);

describe("notifications dispatcher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T00:00:00.000Z"));
    enqueueJobMock.mockReset();
    createLogMock.mockReset();
    preferencesMock.isChannelEnabled.mockReset();
    preferencesMock.buildManagePreferencesLink.mockReturnValue("https://example.com/manage");
    preferencesMock.resolveCategoryForType.mockReturnValue(
      NotificationCategory.BILLING_TRANSACTIONAL,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("queues a notification job when the channel is enabled", async () => {
    const { notifyOnce, setNotificationDispatchObserver } = await import("./dispatcher");

    preferencesMock.isChannelEnabled.mockResolvedValue(true);
    createLogMock.mockResolvedValue({ id: "log-1" });

    const events: Array<{ status: string; channel: NotificationChannel }> = [];
    setNotificationDispatchObserver((event) => {
      events.push({ status: event.status, channel: event.channel });
    });

    await notifyOnce({
      userId: "user-1",
      type: NotificationType.BILLING_PAYMENT_FAILED,
      title: "پرداخت ناموفق",
      body: "لطفاً دوباره تلاش کنید.",
      channels: [NotificationChannel.EMAIL],
      dedupeKey: "invoice-1",
      emailContent: {
        subject: "پرداخت ناموفق بود",
        headline: "پرداخت شما انجام نشد",
        preheader: "لطفاً دوباره تلاش کنید.",
        paragraphs: ["نمونه"],
      },
      emailRecipient: "user@example.com",
    });

    expect(createLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: NotificationType.BILLING_PAYMENT_FAILED,
          channel: NotificationChannel.EMAIL,
          status: NotificationDispatchStatus.QUEUED,
        }),
      }),
    );
    expect(enqueueJobMock).toHaveBeenCalledWith("log-1", expect.objectContaining({
      channel: NotificationChannel.EMAIL,
      userId: "user-1",
      dedupeKey: "invoice-1",
    }));
    expect(events).toEqual([{ status: "queued", channel: NotificationChannel.EMAIL }]);
  });

  it("skips dispatch when the channel is disabled by user preferences", async () => {
    const { notifyOnce, setNotificationDispatchObserver } = await import("./dispatcher");

    preferencesMock.isChannelEnabled.mockResolvedValue(false);

    const events: Array<{ status: string; channel: NotificationChannel }> = [];
    setNotificationDispatchObserver((event) => {
      events.push({ status: event.status, channel: event.channel });
    });

    await notifyOnce({
      userId: "user-2",
      type: NotificationType.BILLING_SUBSCRIPTION_EXPIRY_REMINDER,
      title: "انقضای نزدیک",
      body: "اشتراک شما رو به پایان است.",
      channels: [NotificationChannel.IN_APP],
      dedupeKey: "sub-1",
    });

    expect(createLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationDispatchStatus.SKIPPED,
          channel: NotificationChannel.IN_APP,
        }),
      }),
    );
    expect(enqueueJobMock).not.toHaveBeenCalled();
    expect(events).toEqual([{ status: "skipped", channel: NotificationChannel.IN_APP }]);
  });

  it("treats unique constraint errors as duplicates", async () => {
    const { notifyOnce, setNotificationDispatchObserver } = await import("./dispatcher");

    preferencesMock.isChannelEnabled.mockResolvedValue(true);
    createLogMock.mockRejectedValue({ code: "P2002" });

    const events: Array<{ status: string; channel: NotificationChannel }> = [];
    setNotificationDispatchObserver((event) => {
      events.push({ status: event.status, channel: event.channel });
    });

    await notifyOnce({
      userId: "user-3",
      type: NotificationType.BILLING_INVOICE_READY,
      title: "رسید آماده است",
      body: "رسید پرداخت شما صادر شد.",
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      dedupeKey: "invoice-duplicate",
    });

    expect(enqueueJobMock).not.toHaveBeenCalled();
    expect(events[0]).toEqual({ status: "duplicate", channel: NotificationChannel.EMAIL });
  });
});
