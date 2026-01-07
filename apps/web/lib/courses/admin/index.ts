import type {
  CourseStatus,
  CourseDurationUnit,
  DayOfWeek,
  SemesterStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/db";

export class CourseNotFoundError extends Error {
  constructor() {
    super("COURSE_NOT_FOUND");
    this.name = "CourseNotFoundError";
  }
}

export class SemesterNotFoundError extends Error {
  constructor() {
    super("SEMESTER_NOT_FOUND");
    this.name = "SemesterNotFoundError";
  }
}

export class ScheduleDayConflictError extends Error {
  constructor() {
    super("SCHEDULE_DAY_CONFLICT");
    this.name = "ScheduleDayConflictError";
  }
}

export class ScheduleDayNotFoundError extends Error {
  constructor() {
    super("SCHEDULE_DAY_NOT_FOUND");
    this.name = "ScheduleDayNotFoundError";
  }
}

export class ScheduleSlotNotFoundError extends Error {
  constructor() {
    super("SCHEDULE_SLOT_NOT_FOUND");
    this.name = "ScheduleSlotNotFoundError";
  }
}

export class ScheduleOverlapError extends Error {
  constructor() {
    super("SCHEDULE_SLOT_OVERLAP");
    this.name = "ScheduleOverlapError";
  }
}

export type CourseInput = {
  title: string;
  description: string;
  ageRangeText: string;
  durationValue: number;
  durationUnit: CourseDurationUnit;
  instructorName: string;
  prerequisiteText: string;
  bannerMediaAssetId?: string | null;
  introVideoMediaAssetId?: string | null;
  status?: CourseStatus;
};

export type SemesterInput = {
  title: string;
  startsAt: Date;
  endsAt: Date;
  tuitionAmountIrr: number;
  lumpSumDiscountAmountIrr: number;
  installmentPlanEnabled: boolean;
  installmentCount: number | null;
  capacity: number | null;
  status: SemesterStatus;
};

export type ScheduleSlotInput = {
  title?: string | null;
  startMinute: number;
  endMinute: number;
};

async function ensureCourse(courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw new CourseNotFoundError();
  }
  return course;
}

async function ensureSemester(semesterId: string) {
  const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
  if (!semester) {
    throw new SemesterNotFoundError();
  }
  return semester;
}

async function ensureScheduleDay(
  scheduleDayId: string,
  semesterId: string
) {
  const scheduleDay = await prisma.semesterScheduleDay.findUnique({
    where: { id: scheduleDayId },
  });
  if (!scheduleDay || scheduleDay.semesterId !== semesterId) {
    throw new ScheduleDayNotFoundError();
  }
  return scheduleDay;
}

async function ensureSlot(slotId: string, semesterId: string) {
  const slot = await prisma.semesterClassSlot.findUnique({
    where: { id: slotId },
    include: { scheduleDay: true },
  });
  if (!slot || slot.scheduleDay.semesterId !== semesterId) {
    throw new ScheduleSlotNotFoundError();
  }
  return slot;
}

async function assertNoOverlap(
  tx: Prisma.TransactionClient,
  scheduleDayId: string,
  startMinute: number,
  endMinute: number,
  excludeSlotId?: string
) {
  const conflict = await tx.semesterClassSlot.findFirst({
    where: {
      scheduleDayId,
      id: excludeSlotId ? { not: excludeSlotId } : undefined,
      startMinute: { lt: endMinute },
      endMinute: { gt: startMinute },
    },
    select: { id: true },
  });
  if (conflict) {
    throw new ScheduleOverlapError();
  }
}

export async function createCourse(values: CourseInput) {
  return prisma.course.create({
    data: {
      title: values.title,
      description: values.description,
      ageRangeText: values.ageRangeText,
      durationValue: values.durationValue,
      durationUnit: values.durationUnit,
      instructorName: values.instructorName,
      prerequisiteText: values.prerequisiteText,
      bannerMediaAssetId: values.bannerMediaAssetId ?? null,
      introVideoMediaAssetId: values.introVideoMediaAssetId ?? null,
      status: "draft",
    },
  });
}

export async function updateCourse(courseId: string, values: CourseInput) {
  await ensureCourse(courseId);
  const data: Prisma.CourseUpdateInput = {
    title: values.title,
    description: values.description,
    ageRangeText: values.ageRangeText,
    durationValue: values.durationValue,
    durationUnit: values.durationUnit,
    instructorName: values.instructorName,
    prerequisiteText: values.prerequisiteText,
    status: values.status ?? "draft",
  };
  if (values.bannerMediaAssetId !== undefined) {
    data.bannerMediaAssetId = values.bannerMediaAssetId ?? null;
  }
  if (values.introVideoMediaAssetId !== undefined) {
    data.introVideoMediaAssetId = values.introVideoMediaAssetId ?? null;
  }
  return prisma.course.update({
    where: { id: courseId },
    data,
  });
}

export async function publishCourse(courseId: string) {
  await ensureCourse(courseId);
  return prisma.course.update({
    where: { id: courseId },
    data: { status: "published" },
  });
}

export async function unpublishCourse(courseId: string) {
  await ensureCourse(courseId);
  return prisma.course.update({
    where: { id: courseId },
    data: { status: "draft" },
  });
}

export async function archiveCourse(courseId: string) {
  await ensureCourse(courseId);
  return prisma.course.update({
    where: { id: courseId },
    data: { status: "archived" },
  });
}

export async function createSemester(courseId: string, values: SemesterInput) {
  await ensureCourse(courseId);
  return prisma.semester.create({
    data: {
      courseId,
      title: values.title,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      tuitionAmountIrr: values.tuitionAmountIrr,
      lumpSumDiscountAmountIrr: values.lumpSumDiscountAmountIrr,
      installmentPlanEnabled: values.installmentPlanEnabled,
      installmentCount: values.installmentCount,
      capacity: values.capacity,
      status: values.status,
    },
  });
}

export async function updateSemester(semesterId: string, values: SemesterInput) {
  await ensureSemester(semesterId);
  return prisma.semester.update({
    where: { id: semesterId },
    data: {
      title: values.title,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      tuitionAmountIrr: values.tuitionAmountIrr,
      lumpSumDiscountAmountIrr: values.lumpSumDiscountAmountIrr,
      installmentPlanEnabled: values.installmentPlanEnabled,
      installmentCount: values.installmentCount,
      capacity: values.capacity,
      status: values.status,
    },
  });
}

export async function upsertScheduleDay(semesterId: string, dayOfWeek: DayOfWeek) {
  const existing = await prisma.semesterScheduleDay.findUnique({
    where: {
      semesterId_dayOfWeek: {
        semesterId,
        dayOfWeek,
      },
    },
  });
  if (existing) {
    return { day: existing, created: false };
  }

  const created = await prisma.semesterScheduleDay.create({
    data: {
      semesterId,
      dayOfWeek,
    },
  });

  return { day: created, created: true };
}

export async function removeScheduleDay(semesterId: string, scheduleDayId: string) {
  return prisma.$transaction(async (tx) => {
    const scheduleDay = await tx.semesterScheduleDay.findUnique({
      where: { id: scheduleDayId },
    });
    if (!scheduleDay || scheduleDay.semesterId !== semesterId) {
      throw new ScheduleDayNotFoundError();
    }

    await tx.semesterClassSlot.deleteMany({
      where: { scheduleDayId },
    });

    await tx.semesterScheduleDay.delete({
      where: { id: scheduleDayId },
    });
  });
}

export async function addSlot(
  semesterId: string,
  scheduleDayId: string,
  values: ScheduleSlotInput
) {
  await ensureScheduleDay(scheduleDayId, semesterId);

  return prisma.$transaction(async (tx) => {
    await assertNoOverlap(tx, scheduleDayId, values.startMinute, values.endMinute);
    return tx.semesterClassSlot.create({
      data: {
        scheduleDayId,
        title: values.title ?? null,
        startMinute: values.startMinute,
        endMinute: values.endMinute,
      },
    });
  });
}

export async function updateSlot(
  semesterId: string,
  slotId: string,
  values: ScheduleSlotInput
) {
  const slot = await ensureSlot(slotId, semesterId);

  return prisma.$transaction(async (tx) => {
    await assertNoOverlap(
      tx,
      slot.scheduleDayId,
      values.startMinute,
      values.endMinute,
      slotId
    );
    return tx.semesterClassSlot.update({
      where: { id: slotId },
      data: {
        title: values.title ?? null,
        startMinute: values.startMinute,
        endMinute: values.endMinute,
      },
    });
  });
}

export async function removeSlot(semesterId: string, slotId: string) {
  await ensureSlot(slotId, semesterId);
  return prisma.semesterClassSlot.delete({ where: { id: slotId } });
}
