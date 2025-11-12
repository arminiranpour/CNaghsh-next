import {
  NotificationChannel,
  NotificationDispatchStatus,
  NotificationJobStatus,
  NotificationType,
} from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  notificationJob: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  notificationMessageLog: {
    update: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const sendEmailMock = vi.fn();
vi.mock("./email", () => ({ sendEmail: sendEmailMock }));

describe("notification jobs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T00:00:00.000Z"));
    for (const group of Object.values(prismaMock)) {
      if (typeof group === "object") {
        Object.values(group).forEach((fn) => {
          if (typeof fn === "function" && "mockReset" in fn) {
            fn.mockReset();
          }
        });
      }
    }
    sendEmailMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("delivers in-app notifications successfully", async () => {
    const { processJob } = await import("./jobs");

    prismaMock.notificationJob.findUnique.mockResolvedValue({
      id: "job-1",
      logId: "log-1",
      status: NotificationJobStatus.PENDING,
      attempts: 0,
      maxAttempts: 3,
      runAt: new Date(Date.now() - 1000),
      payload: {
        channel: NotificationChannel.IN_APP,
        userId: "user-1",
        type: NotificationType.BILLING_SUBSCRIPTION_RENEWED,
        title: "تمدید انجام شد",
        body: "اشتراک شما تمدید شد.",
        dedupeKey: "renew-1",
      },
    });
    prismaMock.notificationJob.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.notificationMessageLog.update.mockResolvedValue(undefined);
    prismaMock.notification.create.mockResolvedValue({ id: "notif-1" });
    prismaMock.notificationJob.update.mockResolvedValue({});

    await processJob("job-1");

    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          channel: NotificationChannel.IN_APP,
          dedupeKey: "renew-1",
        }),
      }),
    );
    expect(prismaMock.notificationMessageLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: NotificationDispatchStatus.SENT }),
      }),
    );
    expect(prismaMock.notificationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: NotificationJobStatus.COMPLETED }),
      }),
    );
  });

  it("requeues email jobs when sending fails", async () => {
    const { processJob } = await import("./jobs");

    prismaMock.notificationJob.findUnique.mockResolvedValue({
      id: "job-2",
      logId: "log-2",
      status: NotificationJobStatus.PENDING,
      attempts: 0,
      maxAttempts: 3,
      runAt: new Date(Date.now() - 1000),
      payload: {
        channel: NotificationChannel.EMAIL,
        userId: "user-2",
        type: NotificationType.BILLING_PAYMENT_FAILED,
        title: "پرداخت ناموفق",
        body: "لطفاً دوباره تلاش کنید.",
        dedupeKey: "payment-1",
        email: {
          to: "user@example.com",
          content: {
            subject: "پرداخت ناموفق بود",
            heading: "مشکل در پرداخت",
            preview: "پرداخت انجام نشد",
            body: [{ type: "text", value: "نمونه" }],
          },
        },
      },
    });
    prismaMock.notificationJob.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.notificationMessageLog.update.mockResolvedValue(undefined);
    sendEmailMock.mockResolvedValue({ ok: false, error: "SMTP_ERROR" });
    prismaMock.notificationJob.update.mockResolvedValue({});

    await processJob("job-2");

    expect(sendEmailMock).toHaveBeenCalled();
    expect(prismaMock.notificationMessageLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: NotificationDispatchStatus.QUEUED }),
      }),
    );
    expect(prismaMock.notificationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: NotificationJobStatus.PENDING }),
      }),
    );
  });

  it("processes batches of pending jobs", async () => {
    const jobsModule = await import("./jobs");
    const processJobSpy = vi.spyOn(jobsModule, "processJob").mockResolvedValue(undefined);

    prismaMock.notificationJob.findMany.mockResolvedValue([{ id: "job-a" }, { id: "job-b" }]);

    const processed = await jobsModule.processDueJobs(10);

    expect(processed).toBe(2);
    expect(processJobSpy).toHaveBeenCalledTimes(2);
    expect(processJobSpy).toHaveBeenNthCalledWith(1, "job-a");
    expect(processJobSpy).toHaveBeenNthCalledWith(2, "job-b");

    processJobSpy.mockRestore();
  });
});
