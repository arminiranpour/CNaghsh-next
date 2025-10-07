import { JobModeration, JobStatus } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TestJob = {
  id: string;
  userId: string;
  title: string;
  status: JobStatus;
  moderation: JobModeration;
  featuredUntil: Date | null;
  createdAt: Date;
};

const mockPrisma = vi.hoisted(() => ({
  job: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  jobModerationEvent: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const mockRevalidate = vi.hoisted(() => ({
  revalidateJobRelatedPaths: vi.fn(),
}));

const mockNotifications = vi.hoisted(() => ({
  emitJobApproved: vi.fn(),
  emitJobRejected: vi.fn(),
  emitJobPending: vi.fn(),
  emitJobFeatured: vi.fn(),
  emitJobUnfeatured: vi.fn(),
  emitJobClosed: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/jobs/revalidate", () => mockRevalidate);

vi.mock("@/lib/notifications/events", () => mockNotifications);

const defaultJob: TestJob = {
  id: "job_1",
  userId: "user_1",
  title: "Backend Engineer",
  status: JobStatus.PUBLISHED,
  moderation: JobModeration.PENDING,
  featuredUntil: null as Date | null,
  createdAt: new Date("2024-01-10T00:00:00.000Z"),
};

function setupPrisma(job: TestJob = defaultJob) {
  mockPrisma.job.findUnique.mockResolvedValue(job);
  mockPrisma.job.update.mockResolvedValue(job);
  mockPrisma.jobModerationEvent.create.mockResolvedValue({
    id: "event_1",
    jobId: job.id,
  });
  mockPrisma.$transaction.mockImplementation(async (operations: unknown[]) => {
    const results: unknown[] = [];
    for (const operation of operations as Promise<unknown>[]) {
      results.push(await operation);
    }
    return results;
  });
}

describe("job admin flows", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"));
    setupPrisma();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useRealTimers();
  });

  it("approves a pending job and emits notification", async () => {
    const { approveJobAdmin } = await import("./approveJob");
    const updated = { ...defaultJob, moderation: JobModeration.APPROVED };
    mockPrisma.job.update.mockResolvedValueOnce(updated);

    const result = await approveJobAdmin(defaultJob.id, "admin_1");

    expect(mockPrisma.job.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: defaultJob.id },
        data: { moderation: JobModeration.APPROVED },
      }),
    );
    expect(mockPrisma.jobModerationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "APPROVE", adminId: "admin_1" }),
      }),
    );
    expect(mockRevalidate.revalidateJobRelatedPaths).toHaveBeenCalledWith(defaultJob.id);
    expect(mockNotifications.emitJobApproved).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: defaultJob.id, userId: defaultJob.userId }),
    );
    expect(result).toEqual(updated);
  });

  it("rejects a job with a trimmed note", async () => {
    const { rejectJobAdmin } = await import("./rejectJob");
    const updated = { ...defaultJob, moderation: JobModeration.REJECTED };
    mockPrisma.job.update.mockResolvedValueOnce(updated);

    await rejectJobAdmin(defaultJob.id, "admin_1", "  invalid details  ");

    expect(mockPrisma.jobModerationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "REJECT",
          note: "invalid details",
        }),
      }),
    );
    expect(mockNotifications.emitJobRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: defaultJob.id,
        note: "invalid details",
      }),
    );
  });

  it("suspends an approved job and preserves note", async () => {
    setupPrisma({ ...defaultJob, moderation: JobModeration.APPROVED });
    const { suspendJobAdmin } = await import("./suspendJob");
    const updated = { ...defaultJob, moderation: JobModeration.SUSPENDED };
    mockPrisma.job.update.mockResolvedValueOnce(updated);

    await suspendJobAdmin(defaultJob.id, "admin_1", "missing license");

    expect(mockNotifications.emitJobPending).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SUSPENDED", note: "missing license" }),
    );
  });

  it("clears an existing suspension without duplicate writes", async () => {
    setupPrisma({ ...defaultJob, moderation: JobModeration.SUSPENDED });
    const { suspendJobAdmin } = await import("./suspendJob");

    await suspendJobAdmin(defaultJob.id, "admin_1");

    expect(mockPrisma.job.update).not.toHaveBeenCalled();
  });

  it("features a job for preset days", async () => {
    setupPrisma({
      ...defaultJob,
      moderation: JobModeration.APPROVED,
      featuredUntil: null,
    });
    const { featureJobAdmin } = await import("./featureJob");
    const updated = {
      ...defaultJob,
      moderation: JobModeration.APPROVED,
      featuredUntil: new Date("2024-02-08T12:00:00.000Z"),
    };
    mockPrisma.job.update.mockResolvedValueOnce(updated);

    const result = await featureJobAdmin(defaultJob.id, "admin_1", { type: "PRESET", days: 7 });

    expect(mockNotifications.emitJobFeatured).toHaveBeenCalledWith(
      expect.objectContaining({ featuredUntil: updated.featuredUntil }),
    );
    expect(result).toEqual(updated);
  });

  it("rejects custom feature ranges beyond 60 days", async () => {
    setupPrisma({ ...defaultJob, moderation: JobModeration.APPROVED });
    const { featureJobAdmin } = await import("./featureJob");

    await expect(
      featureJobAdmin(defaultJob.id, "admin_1", {
        type: "CUSTOM",
        until: new Date("2024-04-10T00:00:00.000Z"),
      }),
    ).rejects.toMatchObject({ code: "INVALID_FEATURE_SCHEDULE" });
  });

  it("unfeatures when clearing active feature", async () => {
    setupPrisma({
      ...defaultJob,
      moderation: JobModeration.APPROVED,
      featuredUntil: new Date("2024-02-10T00:00:00.000Z"),
    });
    const { featureJobAdmin } = await import("./featureJob");
    mockPrisma.job.update.mockResolvedValueOnce({
      ...defaultJob,
      featuredUntil: null,
    });

    await featureJobAdmin(defaultJob.id, "admin_1", { type: "CLEAR" });

    expect(mockNotifications.emitJobUnfeatured).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: defaultJob.id }),
    );
  });

  it("closes an open job", async () => {
    const { closeJobByAdmin } = await import("./closeJobAdmin");
    const updated = { ...defaultJob, status: JobStatus.CLOSED };
    mockPrisma.job.update.mockResolvedValueOnce(updated);

    await closeJobByAdmin(defaultJob.id, "admin_1");

    expect(mockPrisma.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: JobStatus.CLOSED } }),
    );
    expect(mockNotifications.emitJobClosed).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: defaultJob.id }),
    );
  });

  it("skips redundant close operations", async () => {
    setupPrisma({ ...defaultJob, status: JobStatus.CLOSED });
    const { closeJobByAdmin } = await import("./closeJobAdmin");

    await closeJobByAdmin(defaultJob.id, "admin_1");

    expect(mockPrisma.job.update).not.toHaveBeenCalled();
    expect(mockNotifications.emitJobClosed).not.toHaveBeenCalled();
  });
});
