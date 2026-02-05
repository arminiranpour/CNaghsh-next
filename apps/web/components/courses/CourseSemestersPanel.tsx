import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { CourseIntroVideoPreview } from "@/components/courses/CourseIntroVideoPreview";
import { formatIrr } from "@/lib/courses/format";
import { computeSemesterPricing } from "@/lib/courses/pricing";
import type { fetchPublicCourseById } from "@/lib/courses/public/queries";
import { formatJalaliDate } from "@/lib/datetime/jalali";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";
import { cn } from "@/lib/utils";
import { iransansBold } from "@/app/fonts";

const semesterStatusLabels = {
  open: "باز",
  closed: "بسته",
} as const;

const getTermName = (termNumber: number): string => {
  switch (termNumber) {
    case 1:
      return "اول";
    case 2:
      return "دوم";
    case 3:
      return "سوم";
    case 4:
      return "چهارم";
    default:
      return termNumber.toString();
  }
};

const cardBaseClassName = "rounded-lg bg-[#FF7F19] text-card-foreground shadow-sm";

type CourseDetail = NonNullable<Awaited<ReturnType<typeof fetchPublicCourseById>>>;

type CourseSemestersPanelProps = {
  course: CourseDetail;
  className?: string;
  density?: "normal" | "compact";
};

// Density-based style getters
const getSpacingClasses = (density: "normal" | "compact") => {
  if (density === "compact") {
    return {
      outerSpacing: "space-y-3",
      cardHeader: "flex flex-col space-y-1 p-4",
      cardContent: "p-4 pt-0",
      videoWrapperPadding: "p-5",
      semesterListGap: "space-y-2",
      semesterItemPadding: "p-3",
    };
  }
  return {
    outerSpacing: "space-y-6",
    cardHeader: "flex flex-col space-y-1.5 p-6",
    cardContent: "p-6 pt-0",
    videoWrapperPadding: "p-[10px] sm:p-[16px]",
    semesterListGap: "space-y-3",
    semesterItemPadding: "p-4",
  };
};

const getTypographyClasses = (density: "normal" | "compact") => {
  if (density === "compact") {
    return {
      cardTitle: "text-lg font-semibold leading-none tracking-tight",
      semesterTitle: "text-base font-semibold",
      semesterDate: "text-xs",
      semesterPrice: "text-base font-bold",
      semesterPlaceholder: "text-sm",
      semesterStatus: "text-xs",
      emptyMessage: "text-xs",
    };
  }
  return {
    cardTitle: "text-xl font-semibold leading-none tracking-tight",
    semesterTitle: "text-lg font-semibold",
    semesterDate: "text-xs",
    semesterPrice: "text-lg font-bold",
    semesterPlaceholder: "text-sm",
    semesterStatus: "text-sm",
    emptyMessage: "text-sm",
  };
};

export function CourseSemestersPanel({
  course,
  className,
  density = "normal",
}: CourseSemestersPanelProps) {
  const introVideoAsset = course.introVideoMediaAsset;
  const introVideoVisible = introVideoAsset?.visibility === "public";
  const introVideoUrl =
    introVideoVisible && introVideoAsset?.outputKey
      ? getPublicMediaUrlFromKey(introVideoAsset.outputKey)
      : null;
  const introVideoPosterUrl =
    introVideoVisible && introVideoAsset?.posterKey
      ? getPublicMediaUrlFromKey(introVideoAsset.posterKey)
      : null;

  const sortedSemesters = [...course.semesters].sort((a, b) => {
    const dateA = new Date(a.startsAt).getTime();
    const dateB = new Date(b.startsAt).getTime();
    return dateA - dateB;
  });

  const totalCourseFee = sortedSemesters.reduce((sum, semester) => {
    const pricing = computeSemesterPricing(semester);
    return sum + pricing.lumpSum.base;
  }, 0);

  const hasIntroVideo = Boolean(introVideoUrl || introVideoPosterUrl);

  const spacing = getSpacingClasses(density);
  const typography = getTypographyClasses(density);

  return (
    <div
      className={cn(
        iransansBold.className,
        spacing.outerSpacing,
        "h-full",
        "flex",
        "flex-col",
        "min-h-0",
        className
      )}
    >
      {/* Single container: Intro video (top) + Total fee + semester list (below) */}
      <div
        className={cn(
          cardBaseClassName,
          "!bg-white",
          "force-white-bg",
          "border",
          "border-transparent",
          "rounded-[23px]",
          "overflow-hidden",
          "flex",
          "flex-col",
          "min-h-0",
          "flex-1"
        )}
        data-card
      >

        {/* Intro video goes ON TOP of the same white card */}
      {hasIntroVideo ? (
        <div className={spacing.videoWrapperPadding}>
    <div
      className={cn(
        "w-full overflow-hidden rounded-lg border border-border",
        "min-h-[250px]",
        "sm:h-[250px]"
      )}
    >
                  <CourseIntroVideoPreview
              mediaId={introVideoAsset?.id}
              title={course.title}
              videoUrl={introVideoUrl}
              posterUrl={introVideoPosterUrl}
              compact={density === "compact"}
            />
          </div>
        </div>
      ) : null}

        {/* Total Course Fee */}
        <div className={cn(spacing.cardHeader, "!bg-white", "force-white-bg")}>
          <h3 className={cn(typography.cardTitle, "text-[#FF7F19]")}>
            هزینه دوره: {formatIrr(totalCourseFee)}
          </h3>
        </div>

        <div
          className={cn(
            spacing.cardContent,
            "text-black",
            "flex-1",
            "min-h-0",
            "overflow-y-auto"
          )}
        >
          {sortedSemesters.length === 0 ? (
            <p className={cn(typography.emptyMessage, "text-muted-foreground")}>
              ترمی برای این دوره منتشر نشده است.
            </p>
          ) : (
            <div className={spacing.semesterListGap}>
              {sortedSemesters.map((semester, index) => {
                const pricing = computeSemesterPricing(semester);
                const termNumber = index + 1;
                const isOpen = semester.status === "open";
                const isClosed = semester.status === "closed";

                return (
                  <Link
                    key={semester.id}
                    href={`/courses/${course.id}/semesters/${semester.id}`}
                    className="block"
                  >
                    <div
                      className={cn(
                        "rounded-lg transition hover:shadow-md border",
                        isOpen ? "border-primary" : "border-border cursor-pointer",
                        "!bg-[#FF7F19]",
                        "force-orange-bg"
                      )}
                      data-card
                      style={{ backgroundColor: "#FF7F19" }}
                    >
                      <div className={cn(spacing.semesterItemPadding, "text-black")}>
                        <div
                          className={cn(
                            "flex items-stretch justify-between",
                            density === "compact" ? "gap-4" : "gap-6"
                          )}
                        >
                          <div
                            className={cn(
                              "flex-1 text-right",
                              density === "compact" ? "space-y-1" : "space-y-2"
                            )}
                          >
                            <h3 className={cn(typography.semesterTitle, "text-black")}>
                              ثبت نام ترم {getTermName(termNumber)}
                            </h3>

                            {isOpen ? (
                              <p className={cn(typography.semesterDate, "text-[10px] text-white")}>
                                از {formatJalaliDate(semester.startsAt)} تا{" "}
                                {formatJalaliDate(semester.endsAt)}
                              </p>
                            ) : (
                              <p className={cn(typography.semesterPlaceholder, "text-muted-foreground")}>
                                به زودی اعلام خواهد شد.
                              </p>
                            )}
                          </div>

                          <div
                            className={cn(
                              "shrink-0 flex flex-col items-center justify-center self-stretch",
                              density === "compact" ? "min-w-[72px]" : "min-w-[96px]",
                              density === "compact" ? "gap-1" : "gap-2"
                            )}
                          >
                            {isOpen ? (
                              <p
                                className={cn(
                                  typography.semesterPrice,
                                  "text-white whitespace-nowrap"
                                )}
                              >
                                {formatIrr(pricing.lumpSum.base).replace(" ریال", "")}
                              </p>
                            ) : (
                              <span
                                className={cn(
                                  "text-muted-foreground",
                                  density === "compact" ? "text-xl" : "text-2xl"
                                )}
                              >
                                ؟
                              </span>
                            )}

                            {isClosed && (
                              <div className={density === "compact" ? "mt-1" : "mt-2"}>
                                <Badge variant="secondary">{semesterStatusLabels.closed}</Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {sortedSemesters.length < 4 ? (
                <>
                  {Array.from({ length: 4 - sortedSemesters.length }, (_, i) => {
                    const placeholderTermNumber = sortedSemesters.length + i + 1;
                    return (
                      <div
                        key={`placeholder-${placeholderTermNumber}`}
                        className={cn("rounded-lg transition", "!bg-[#D9D9D9]", "force-gray-bg")}
                        data-card
                        style={{ borderRadius: "0.75rem", backgroundColor: "#D9D9D9" }}
                      >
                        <div className={cn(spacing.semesterItemPadding, "text-black")}>
                          <div className="flex items-stretch justify-between">
                            <div
                              className={cn(
                                "flex-1 text-right",
                                density === "compact" ? "space-y-1" : "space-y-2"
                              )}
                            >
                              <h3 className={cn(typography.semesterTitle, "text-black")}>
                                ثبت نام ترم {getTermName(placeholderTermNumber)}
                              </h3>
                              <p className={cn(typography.semesterPlaceholder, "text-muted-foreground")}>
                                به زودی اعلام خواهد شد.
                              </p>
                            </div>
                            <div
                              className={cn(
                                "shrink-0 flex items-center justify-center self-stretch text-muted-foreground",
                                density === "compact" ? "min-w-[72px] text-xl" : "min-w-[96px] text-2xl"
                              )}
                            >
                              ؟
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
