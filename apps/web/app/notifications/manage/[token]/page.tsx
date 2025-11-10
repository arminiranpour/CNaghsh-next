import { PreferenceChannelToggleGroup } from "@/components/notifications/preference-channel-toggle-group";
import {
  CATEGORY_CONFIG,
  getUserPreferences,
} from "@/lib/notifications/preferences";
import { verifyManageToken } from "@/lib/notifications/signing";

const containerClass = "mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-4 py-12";

export default async function ManageNotificationsPage({
  params,
}: {
  params: { token: string };
}) {
  const rawToken = params.token ?? "";
  const token = decodeURIComponent(rawToken);
  const payload = verifyManageToken(token);

  if (!payload?.userId) {
    return (
      <div className={containerClass} dir="rtl">
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-destructive">
          لینک وارد شده معتبر نیست یا منقضی شده است. لطفاً از داشبورد وارد شوید و لینک جدیدی دریافت کنید.
        </div>
      </div>
    );
  }

  const preferences = await getUserPreferences(payload.userId);

  return (
    <div className={containerClass} dir="rtl">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">مدیریت اعلان‌های صورتحساب</h1>
        <p className="text-sm text-muted-foreground">
          تغییرات در لحظه اعمال می‌شود. در صورت خروج از حساب، می‌توانید از همین لینک برای تنظیم دوباره استفاده کنید.
        </p>
      </div>

      <div className="space-y-4">
        {preferences.map((pref) => {
          const config = CATEGORY_CONFIG[pref.category];

          return (
            <div
              key={pref.category}
              className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background p-5 shadow-sm md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-2">
                <h2 className="text-base font-semibold text-foreground">{config.title}</h2>
                <p className="text-xs text-muted-foreground leading-6">{config.description}</p>
                {pref.locked ? (
                  <p className="text-xs font-medium text-primary">این دسته‌بندی غیرقابل غیرفعال‌سازی است.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">برای تغییر مجدد می‌توانید هر زمان از همین لینک استفاده کنید.</p>
                )}
              </div>
              <PreferenceChannelToggleGroup
                category={pref.category}
                emailEnabled={pref.emailEnabled}
                inAppEnabled={pref.inAppEnabled}
                locked={pref.locked}
                token={token}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
