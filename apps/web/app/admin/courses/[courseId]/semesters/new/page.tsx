import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";

import { SemesterForm } from "../../../_components/semester-form";
import { createSemesterAction } from "../../../actions";

export default async function NewSemesterPage({
  params,
}: {
  params: { courseId: string };
}) {
  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    select: { id: true, title: true },
  });

  if (!course) {
    notFound();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Link className="text-primary underline-offset-4 hover:underline" href={`/admin/courses/${course.id}`}>
            {course.title}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span>New Semester</span>
        </div>
        <h1 className="text-2xl font-semibold">Create Semester</h1>
        <p className="text-sm text-muted-foreground">Configure dates, tuition, and payment options.</p>
      </div>
      <SemesterForm
        action={createSemesterAction.bind(null, course.id)}
        submitLabel="Create Semester"
        redirectTo={`/admin/courses/${course.id}`}
      />
    </div>
  );
}
