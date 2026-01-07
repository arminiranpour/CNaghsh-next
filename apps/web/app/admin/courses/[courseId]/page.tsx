import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";
import { getManifestUrlForMedia } from "@/lib/media/manifest";

import { CourseBannerUploader } from "../_components/course-banner-uploader";
import { CourseIntroVideoUploader } from "../_components/course-intro-video-uploader";
import { CourseForm } from "../_components/course-form";
import { updateCourseAction } from "../actions";

export default async function CourseDetailPage({
  params,
}: {
  params: { courseId: string };
}) {
  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      bannerMediaAsset: {
        select: {
          outputKey: true,
          visibility: true,
        },
      },
      introVideoMediaAsset: {
        select: {
          outputKey: true,
          visibility: true,
        },
      },
      semesters: {
        orderBy: { startsAt: "desc" },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const bannerUrl =
    course.bannerMediaAsset?.outputKey && course.bannerMediaAsset.visibility === "public"
      ? getPublicMediaUrlFromKey(course.bannerMediaAsset.outputKey)
      : null;
  let introVideoIsHls = Boolean(course.introVideoMediaAsset?.outputKey?.endsWith(".m3u8"));
  let introVideoUrl: string | null = null;
  if (course.introVideoMediaAsset?.outputKey && course.introVideoMediaAsset.visibility === "public") {
    introVideoUrl = getPublicMediaUrlFromKey(course.introVideoMediaAsset.outputKey);
  } else if (course.introVideoMediaAssetId) {
    const manifestInfo = await getManifestUrlForMedia(course.introVideoMediaAssetId);
    introVideoUrl = manifestInfo?.manifestUrl ?? null;
  }
  if (!introVideoIsHls && introVideoUrl) {
    introVideoIsHls = introVideoUrl.split("?")[0]?.endsWith(".m3u8") ?? false;
  }

  return (
    <div className="space-y-10">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Edit Course</h1>
          <p className="text-sm text-muted-foreground">Update course details and status.</p>
        </div>
        <CourseBannerUploader
          courseId={course.id}
          bannerUrl={bannerUrl}
          bannerMediaAssetId={course.bannerMediaAssetId ?? null}
        />
        <CourseIntroVideoUploader
          courseId={course.id}
          introVideoMediaAssetId={course.introVideoMediaAssetId ?? null}
          videoUrl={introVideoUrl}
          isHls={introVideoIsHls}
        />
        <CourseForm
          initialValues={{
            title: course.title,
            description: course.description,
            ageRangeText: course.ageRangeText,
            durationValue: course.durationValue,
            durationUnit: course.durationUnit,
            instructorName: course.instructorName,
            prerequisiteText: course.prerequisiteText,
            bannerMediaAssetId: course.bannerMediaAssetId ?? "",
            status: course.status,
          }}
          action={updateCourseAction.bind(null, course.id)}
          submitLabel="Save Changes"
          showStatus
        />
      </div>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Semesters</h2>
            <p className="text-sm text-muted-foreground">Create and manage semester sessions.</p>
          </div>
          <Link
            className="text-primary underline-offset-4 hover:underline"
            href={`/admin/courses/${course.id}/semesters/new`}
          >
            Add Semester
          </Link>
        </div>
        <div className="overflow-x-auto rounded-md border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {course.semesters.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                    No semesters yet.
                  </td>
                </tr>
              ) : (
                course.semesters.map((semester) => (
                  <tr key={semester.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{semester.title}</td>
                    <td className="px-4 py-3">{semester.status}</td>
                    <td className="px-4 py-3">
                      {semester.startsAt.toLocaleDateString("en-US")} -{" "}
                      {semester.endsAt.toLocaleDateString("en-US")}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        className="text-primary underline-offset-4 hover:underline"
                        href={`/admin/courses/${course.id}/semesters/${semester.id}`}
                      >
                        Edit Semester
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
