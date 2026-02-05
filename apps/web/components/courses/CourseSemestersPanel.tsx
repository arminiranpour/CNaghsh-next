import Link from "next/link";
import { Check } from "lucide-react";
import { CourseIntroVideoPreview } from "@/components/courses/CourseIntroVideoPreview";
import { formatIrr } from "@/lib/courses/format";
import { computeSemesterPricing } from "@/lib/courses/pricing";
import type { fetchPublicCourseById } from "@/lib/courses/public/queries";
import { formatJalaliDate } from "@/lib/datetime/jalali";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";
import { cn } from "@/lib/utils";
import { iransansBold } from "@/app/fonts";

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
type CourseSemester = CourseDetail["semesters"][number];

type CourseSemestersPanelProps = {
  course: CourseDetail;
  className?: string;
  density?: "normal" | "compact";
};

type SemesterRowVariant = "comingSoon" | "available" | "enrolled";

const getSemesterRowClasses = (variant: SemesterRowVariant) => {
  switch (variant) {
    case "comingSoon":
      return {
        container: "bg-[#D9D9D9]",
        title: "text-black",
        subtitle: "text-[#808080]",
        price: "text-black",
      };
    case "enrolled":
      return {
        container: "bg-[#0A3F35]",
        title: "text-white",
        subtitle: "text-white",
        price: "text-white",
      };
    case "available":
    default:
      return {
        container: "bg-[#FF7F19]",
        title: "text-black",
        subtitle: "text-white",
        price: "text-white",
      };
  }
};

const resolveEnrollmentState = (semester: CourseSemester) => {
  const extendedSemester = semester as CourseSemester & {
    isEnrolled?: boolean;
    enrollmentId?: string | null;
    enrollment?: { id?: string | null } | null;
    currentEnrollment?: { id?: string | null } | null;
    userEnrollment?: { id?: string | null } | null;
    enrollments?: Array<{ id?: string | null; status?: string | null }> | null;
  };

  if (typeof extendedSemester.isEnrolled === "boolean") {
    return extendedSemester.isEnrolled;
  }

  return Boolean(
    extendedSemester.enrollmentId ||
      extendedSemester.enrollment?.id ||
      extendedSemester.currentEnrollment?.id ||
      extendedSemester.userEnrollment?.id ||
      (extendedSemester.enrollments && extendedSemester.enrollments.length > 0)
  );
};

type SemesterRowProps = {
  title: string;
  subtitle: string;
  priceLabel: string;
  isAvailable: boolean;
  isEnrolled: boolean;
};

function SemesterRow({ title, subtitle, priceLabel, isAvailable, isEnrolled }: SemesterRowProps) {
  const variant: SemesterRowVariant = !isAvailable
    ? "comingSoon"
    : isEnrolled
      ? "enrolled"
      : "available";
  const classes = getSemesterRowClasses(variant);

  return (
    <div
      className={cn(
        "w-full h-[52px] rounded-[12px] px-4",
        "flex items-center justify-between",
        "transition",
        classes.container
      )}
    >
      <div className="flex items-center gap-3">
        {isAvailable ? (
          isEnrolled ? (
            <div
              className="flex h-[23px] w-[23px] items-center justify-center rounded-full bg-white"
              aria-hidden="true"
            >
              <Check className="h-[14px] w-[14px] text-[#0A3F35]" strokeWidth={3} />
            </div>
          ) : (
            <div className="h-[23px] w-[23px] rounded-full border border-white" aria-hidden="true" />
          )
        ) : null}
        <div className="text-right">
          <p className={cn("text-[15px] font-bold leading-[23px]", classes.title)}>{title}</p>
          <p className={cn("text-[8px] font-normal leading-[13px]", classes.subtitle)}>
            {subtitle}
          </p>
        </div>
      </div>
      <div className={cn("shrink-0 text-left text-[19px] font-bold leading-[30px]", classes.price)}>
        {priceLabel}
      </div>
    </div>
  );
}

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
                const isAvailable = semester.status === "open";
                const isEnrolled = resolveEnrollmentState(semester);
                const priceLabel = isAvailable
                  ? formatIrr(pricing.lumpSum.base).replace(" ریال", "")
                  : "؟";
                const subtitle = isAvailable
                  ? `از ${formatJalaliDate(semester.startsAt)} تا ${formatJalaliDate(
                      semester.endsAt
                    )}`
                  : "به زودی اعلام خواهد شد.";

                return (
                  <Link
                    key={semester.id}
                    href={`/courses/${course.id}/semesters/${semester.id}`}
                    className="block"
                  >
                    <SemesterRow
                      title={`ثبت نام ترم ${getTermName(termNumber)}`}
                      subtitle={subtitle}
                      priceLabel={priceLabel}
                      isAvailable={isAvailable}
                      isEnrolled={isEnrolled}
                    />
                  </Link>
                );
              })}

              {sortedSemesters.length < 4 ? (
                <>
                  {Array.from({ length: 4 - sortedSemesters.length }, (_, i) => {
                    const placeholderTermNumber = sortedSemesters.length + i + 1;
                    return (
                      <SemesterRow
                        key={`placeholder-${placeholderTermNumber}`}
                        title={`ثبت نام ترم ${getTermName(placeholderTermNumber)}`}
                        subtitle="به زودی اعلام خواهد شد."
                        priceLabel="؟"
                        isAvailable={false}
                        isEnrolled={false}
                      />
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
