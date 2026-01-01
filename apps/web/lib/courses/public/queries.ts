import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

const semesterSelect = {
  id: true,
  courseId: true,
  title: true,
  startsAt: true,
  endsAt: true,
  tuitionAmountIrr: true,
  lumpSumDiscountAmountIrr: true,
  installmentPlanEnabled: true,
  installmentCount: true,
  status: true,
} satisfies Prisma.SemesterSelect;

const courseSelect = {
  id: true,
  title: true,
  description: true,
  ageRangeText: true,
  durationValue: true,
  durationUnit: true,
  instructorName: true,
  prerequisiteText: true,
  bannerMediaAsset: {
    select: {
      id: true,
      outputKey: true,
      posterKey: true,
      visibility: true,
      status: true,
    },
  },
  introVideoMediaAsset: {
    select: {
      id: true,
      outputKey: true,
      posterKey: true,
      visibility: true,
      status: true,
    },
  },
} satisfies Prisma.CourseSelect;

export async function fetchPublishedCourses({
  page = 1,
  pageSize = 12,
}: {
  page?: number;
  pageSize?: number;
}) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 12;
  const items = await prisma.course.findMany({
    where: { status: "published" },
    select: {
      id: true,
      title: true,
      ageRangeText: true,
      durationValue: true,
      durationUnit: true,
      instructorName: true,
      bannerMediaAsset: {
        select: {
          id: true,
          outputKey: true,
          posterKey: true,
          visibility: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * safeSize,
    take: safeSize + 1,
  });

  const hasNextPage = items.length > safeSize;
  const sliced = hasNextPage ? items.slice(0, safeSize) : items;

  return {
    items: sliced,
    page: safePage,
    pageSize: safeSize,
    hasNextPage,
    hasPrevPage: safePage > 1,
  };
}

export async function fetchPublicCourseById(courseId: string) {
  return prisma.course.findFirst({
    where: { id: courseId, status: "published" },
    select: {
      ...courseSelect,
      semesters: {
        where: { status: { in: ["open", "closed"] } },
        orderBy: { startsAt: "desc" },
        select: semesterSelect,
      },
    },
  });
}

export async function fetchPublicSemesterById(courseId: string, semesterId: string) {
  return prisma.semester.findFirst({
    where: {
      id: semesterId,
      courseId,
      status: { in: ["open", "closed"] },
      course: { status: "published" },
    },
    select: {
      id: true,
      courseId: true,
      title: true,
      startsAt: true,
      endsAt: true,
      tuitionAmountIrr: true,
      lumpSumDiscountAmountIrr: true,
      installmentPlanEnabled: true,
      installmentCount: true,
      status: true,
      course: {
        select: {
          id: true,
          title: true,
          instructorName: true,
        },
      },
      scheduleDays: {
        select: {
          id: true,
          dayOfWeek: true,
          classSlots: {
            select: {
              id: true,
              title: true,
              startMinute: true,
              endMinute: true,
            },
          },
        },
      },
    },
  });
}
