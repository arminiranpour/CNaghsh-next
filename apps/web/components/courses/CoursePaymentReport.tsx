import { cn } from "@/lib/utils";
import { iransansBold } from "@/app/fonts";

export type CoursePaymentReportRow = {
  dateLabel: string;
  title: string;
  amountLabel: string;
  statusLabel: string;
};

type CoursePaymentReportProps = {
  rows: CoursePaymentReportRow[];
  className?: string;
  maxRows?: number;
};

export function CoursePaymentReport({ rows, className, maxRows }: CoursePaymentReportProps) {
  if (!rows || rows.length === 0) {
    return null;
  }

  const visibleRows = maxRows ? rows.slice(0, maxRows) : rows;

  return (
    <div className={cn(iransansBold.className, "mt-8", className)}>
      <h2 className="text-right text-[16px] font-bold leading-[25px] text-black">گزارش پرداخت</h2>
      <div className="mt-3">
        <div className="flex items-center justify-between border-b border-[#7A7A7A]/60 pb-2 text-[11px] font-bold leading-[17px] text-[#7A7A7A]">
          <span className="w-[70px] text-right">تاریخ</span>
          <span className="flex-1 px-3 text-right">عنوان</span>
          <span className="w-[120px] text-right">مبلغ</span>
          <span className="w-[140px] text-right">وضعیت پرداخت</span>
        </div>
        <div className="divide-y divide-[#7A7A7A]/60">
          {visibleRows.map((row, index) => (
            <div
              key={`${row.title}-${row.dateLabel}-${index}`}
              className="flex items-center justify-between py-2 text-[13px] font-normal leading-[20px] text-[#7A7A7A]"
            >
              <span className="w-[70px] text-right">{row.dateLabel}</span>
              <span className="flex-1 truncate px-3 text-right">{row.title}</span>
              <span className="w-[120px] text-right">{row.amountLabel}</span>
              <span className="w-[140px] text-right">{row.statusLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
