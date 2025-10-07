import Link from "next/link";

export default function JobNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 px-6 py-24 text-center" dir="rtl">
      <h1 className="text-3xl font-bold text-foreground">آگهی مورد نظر پیدا نشد</h1>
      <p className="text-sm text-muted-foreground">
        ممکن است این فرصت شغلی حذف شده باشد یا هنوز برای نمایش عمومی تایید نشده باشد.
      </p>
      <Link
        href="/jobs"
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        بازگشت به لیست فرصت‌های شغلی
      </Link>
    </div>
  );
}
