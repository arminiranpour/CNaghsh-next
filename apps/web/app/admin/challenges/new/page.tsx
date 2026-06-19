import { ChallengeForm } from "../_components/challenge-form";
import { createChallengeAction } from "../actions";

export default function NewChallengePage() {
  return (
    <div className="max-w-4xl space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-semibold">ایجاد چالش</h1>
        <p className="text-sm text-muted-foreground">
          ابتدا اطلاعات اصلی چالش را ثبت کنید. سپس در صفحه ویرایش، کاور و ویدیوی راهنما را بارگذاری کنید.
        </p>
      </div>

      <div className="rounded-md border border-border bg-background p-6 text-sm text-muted-foreground">
        فایل‌های رسانه‌ای عمومی این چالش بعد از ایجاد پیش‌نویس و در صفحه ویرایش قابل بارگذاری هستند.
      </div>

      <ChallengeForm
        action={createChallengeAction}
        submitLabel="ایجاد چالش"
        redirectTo="/admin/challenges"
      />
    </div>
  );
}
