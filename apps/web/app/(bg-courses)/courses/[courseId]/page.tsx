import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { CourseInfoPanel } from "@/components/courses/CourseInfoPanel";
import { CourseSemestersPanel } from "@/components/courses/CourseSemestersPanel";
import { fetchPublicCourseById } from "@/lib/courses/public/queries";

export default async function CourseDetailPage({
  params,
}: {
  params: { courseId: string };
}) {
  const course = await fetchPublicCourseById(params.courseId);

  if (!course) {
    notFound();
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10">
        <div className="flex justify-begin mb-4">
          <Link href="/courses" className="inline-block">
            <Image
              src="/images/back-button.png"
              alt="Back"
              width={50}
              height={50}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>
        <div className="grid gap-2 lg:grid-cols-11" data-no-transparent>
          <div className="lg:col-span-6 overflow-auto">
            <CourseInfoPanel course={course} />
          </div>
          {/* Compact mode: h-[650px] with density="compact" */}
          <div className="h-[580px] min-h-0 lg:col-span-4">
            <CourseSemestersPanel course={course} density="compact" />
          </div>
          {/* Normal mode example (commented out):
          <div className="h-[800px] min-h-0 lg:col-span-5">
            <CourseSemestersPanel course={course} density="normal" />
          </div>
          */}
        </div>
      </div>
    </div>
  );
}
