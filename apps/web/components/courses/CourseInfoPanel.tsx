import { formatCourseDuration } from "@/lib/courses/format";
import type { fetchPublicCourseById } from "@/lib/courses/public/queries";
import { cn } from "@/lib/utils";
import { iransans, iransansMedium, iransansBold } from "@/app/fonts";

const cardBaseClassName =
  "bg-card text-card-foreground shadow-sm";
const cardContentClassName = "p-6 pt-0";

type CourseDetail = NonNullable<Awaited<ReturnType<typeof fetchPublicCourseById>>>;

type CourseInfoPanelProps = {
  course: CourseDetail;
};

export function CourseInfoPanel({ course }: CourseInfoPanelProps) {
  return (
<div className={`${iransansBold.className} space-y-6`}>
{/* Course Title */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
            <h1 className="text-4xl font-bold text-[#FF7F19]">
              {course.title}
            </h1>
        </div>


      </div>

      {/* Course Details */}
      <div className={cn(cardBaseClassName, "!bg-transparent")} data-transparent>
        <div className={cn(cardContentClassName, "space-y-8 text-sm text-black", "!bg-transparent")}>
          <p className={`${iransansMedium.className} leading-8 whitespace-pre-line text-black`}>
            {course.description}
          </p>

          <div>
            <span className="font-medium text-black">گروه سنی: </span>
            <span className={`${iransansMedium.className} text-black`}>{course.ageRangeText}</span>
          </div>

          <div>
            <span className="font-medium text-black">مدت زمان دوره: </span>
            <span className={`${iransansMedium.className} text-black`}>
              {formatCourseDuration(course.durationValue, course.durationUnit)}
            </span>
          </div>

          <div>
            <span className="font-medium text-black">مدرس: </span>
            <span className={`${iransansMedium.className} text-black`}>
              {course.instructorName || "در این دوره اساتید مختلف مشغول تدریس هستند."}
            </span>
          </div>

          <div>
            <span className="font-medium text-black">هزینه دوره: </span>
            <span className={`${iransansMedium.className} text-black`}>
              هزینه دوره بر اساس ترم ثبت نام متفاوت میباشد.
            </span>
          </div>

          <div>
            <span className="font-medium text-black">پیش نیاز: </span>
            <span className={`${iransansMedium.className} text-black`}>
              {course.prerequisiteText || "پذیرفته شدگان در تست برگزار شده."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
