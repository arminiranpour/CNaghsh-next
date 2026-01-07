import { formatDayOfWeek, formatMinutesToTime } from "@/lib/courses/format";
import type { DayOfWeek } from "@prisma/client";
import { iransansMedium } from "@/app/fonts";

const dayOrder = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as const;

type ScheduleDay = {
  id: string;
  dayOfWeek: string;
  classSlots: {
    id: string;
    title: string | null;
    startMinute: number;
    endMinute: number;
  }[];
};

type SemesterSchedulePanelProps = {
  semesterTitle: string;
  scheduleDays: ScheduleDay[];
};

export function SemesterSchedulePanel({
  semesterTitle,
  scheduleDays,
}: SemesterSchedulePanelProps) {
  const sortedDays = [...scheduleDays]
    .map((day) => ({
      ...day,
      classSlots: [...day.classSlots].sort((a, b) => a.startMinute - b.startMinute),
    }))
    .sort(
      (a, b) =>
        dayOrder.indexOf(a.dayOfWeek as (typeof dayOrder)[number]) -
        dayOrder.indexOf(b.dayOfWeek as (typeof dayOrder)[number])
    );

  // Ensure all 7 days are shown, even if no schedule
  const allDays = dayOrder.map((dayKey) => {
    const existingDay = sortedDays.find((d) => d.dayOfWeek === dayKey);
    return (
      existingDay || {
        id: `placeholder-${dayKey}`,
        dayOfWeek: dayKey,
        classSlots: [],
      }
    );
  });

  return (
    <div className={`${iransansMedium.className} w-full max-w-[467px]`} dir="rtl">
      {/* Title */}
      <h2 className="mb-4 text-right text-2xl font-bold text-[#FF7F19]">{semesterTitle}</h2>
      <h3 className="mb-6 text-right text-lg font-semibold text-black">برنامه هفتگی ترم اول</h3>

      {/* Schedule */}
      <div className="relative space-y-[43px]">
        {allDays.map((day, dayIndex) => (
          <div key={day.id} className="relative flex items-start gap-4">
            {/* Day Name Button - Right Side */}
            <div className="shrink-0">
              <div className="flex h-[36px] w-[108px] items-center justify-center rounded-[43px] bg-black">
                <span className="text-[20px] font-bold leading-[31px] text-white text-center">
                  {formatDayOfWeek(day.dayOfWeek as DayOfWeek)}
                </span>
              </div>
            </div>

            {/* Class Slots - Left Side */}
            <div className="flex flex-1 gap-2">
              {day.classSlots.length > 0 ? (
                day.classSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="inline-flex flex-col rounded-[7px] border-[0.5px] border-black p-2"
                  >
                    <p className="mb-1 text-center text-[12px] font-bold leading-[19px] text-black">
                      {slot.title || "کلاس"}
                    </p>
                    <p className="text-center text-[12px] font-bold leading-[19px] text-[#FF7F19]">
                      {formatMinutesToTime(slot.startMinute)} تا{" "}
                      {formatMinutesToTime(slot.endMinute)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="inline-flex flex-col rounded-[7px] border-[0.5px] border-black p-2"
>
                  <p className="text-right text-[12px] font-bold leading-[19px] text-black">
                    کلاسی ثبت نشده
                  </p>
                </div>
              )}
            </div>

            {/* Divider Line */}
            {dayIndex < allDays.length - 1 && (
              <div className="absolute -bottom-[21.5px] inset-x-0 h-[0.5px] bg-black" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

