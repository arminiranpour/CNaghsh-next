import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SemesterPaymentPanel } from "@/components/courses/SemesterPaymentPanel";
import { SemesterSchedulePanel } from "@/components/courses/SemesterSchedulePanel";
import { computeSemesterPricing } from "@/lib/courses/pricing";
import { fetchPublicSemesterById } from "@/lib/courses/public/queries";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";

export default async function SemesterDetailPage({
  params,
}: {
  params: { courseId: string; semesterId: string };
}) {
  const semester = await fetchPublicSemesterById(params.courseId, params.semesterId);

  if (!semester) {
    notFound();
  }

  const pricing = computeSemesterPricing(semester);
  const introVideoAsset = semester.course.introVideoMediaAsset;
  const introVideo =
    introVideoAsset?.visibility === "public"
      ? {
          mediaId: introVideoAsset.id,
          videoUrl: introVideoAsset.outputKey
            ? getPublicMediaUrlFromKey(introVideoAsset.outputKey)
            : null,
          posterUrl: introVideoAsset.posterKey
            ? getPublicMediaUrlFromKey(introVideoAsset.posterKey)
            : null,
        }
      : null;

  return (
    <div className="relative min-h-screen" dir="rtl">
      <div
        className="fixed inset-0 z-0 bg-[url('/images/concrete-wall.png')] bg-cover bg-center bg-no-repeat"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10">
        {/* Back Button */}
        <div className="flex justify-begin mb-4">
          <Link href={`/courses/${params.courseId}`} className="inline-block">
            <Image
              src="/images/back-button.png"
              alt="Back"
              width={50}
              height={50}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-2 lg:grid-cols-11" data-no-transparent>
          {/* Right Pane - Schedule Panel (appears on right in RTL) */}
          <div className="flex justify-start lg:col-span-6 overflow-auto">
            <SemesterSchedulePanel
              semesterTitle={semester.title}
              scheduleDays={semester.scheduleDays}
            />
          </div>

          {/* Left Pane - Payment Panel (appears on left in RTL) */}
          <div className="flex justify-start h-[650px] min-h-0 lg:col-span-5">
            <SemesterPaymentPanel
              semesterTitle={semester.title}
              pricing={pricing}
              introVideo={introVideo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
