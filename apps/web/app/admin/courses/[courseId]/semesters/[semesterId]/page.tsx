import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";

import { ScheduleEditor } from "../../../_components/schedule-editor";
import { SemesterForm } from "../../../_components/semester-form";
import { updateSemesterAction } from "../../../actions";

function toDateTimeInput(value: Date) {
  return value.toISOString().slice(0, 16);
}

export default async function SemesterDetailPage({
  params,
}: {
  params: { courseId: string; semesterId: string };
}) {
  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    select: { id: true, title: true },
  });

  if (!course) {
    notFound();
  }

  const semester = await prisma.semester.findFirst({
    where: { id: params.semesterId, courseId: params.courseId },
    include: {
      scheduleDays: {
        include: {
          classSlots: true,
        },
      },
    },
  });

  if (!semester) {
    notFound();
  }

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Link className="text-primary underline-offset-4 hover:underline" href={`/admin/courses/${course.id}`}>
            {course.title}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span>{semester.title}</span>
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Edit Semester</h1>
          <p className="text-sm text-muted-foreground">
            Update schedule, payment configuration, and enrollment settings.
          </p>
        </div>
        {semester.status === "closed" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This semester is closed but still editable.
          </div>
        ) : null}
      </div>
      <div className="max-w-3xl space-y-6">
        <SemesterForm
          initialValues={{
            title: semester.title,
            startsAt: toDateTimeInput(semester.startsAt),
            endsAt: toDateTimeInput(semester.endsAt),
            tuitionAmountIrr: semester.tuitionAmountIrr,
            lumpSumDiscountAmountIrr: semester.lumpSumDiscountAmountIrr,
            installmentPlanEnabled: semester.installmentPlanEnabled,
            installmentCount: semester.installmentCount ?? null,
            capacity: semester.capacity ?? null,
            status: semester.status,
          }}
          action={updateSemesterAction.bind(null, course.id, semester.id)}
          submitLabel="Save Changes"
        />
      </div>
      <ScheduleEditor courseId={course.id} semesterId={semester.id} days={semester.scheduleDays} />
    </div>
  );
}
