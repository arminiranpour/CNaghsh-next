import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { ensureAdmin } from "@/lib/admin/ensureAdmin";

const DEV_BYPASS_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.DEV_ADMIN_BYPASS === "true";

function DevBypassInstructions() {
  return (
    <div className="rounded-lg border bg-background p-6 shadow-sm">
      <h2 className="text-xl font-semibold">دسترسی مدیر مورد نیاز است</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        برای مشاهده صفحه مدیریت صورتحساب در محیط توسعه، یکی از مسیرهای زیر را دنبال کنید:
      </p>
      <ol className="mt-4 list-decimal space-y-2 pe-4 text-sm leading-6 text-muted-foreground">
        <li>
          با استفاده از Prisma Studio یا اسکریپت کمکی، شناسه یک کاربر با نقش مدیر را پیدا کنید.
        </li>
        <li>
          در مرورگر محلی مقدار کوکی <code className="rounded bg-muted px-1 py-0.5">ADMIN_USER_ID</code> را روی آن شناسه تنظیم کنید
          یا درخواست‌های خود را با هدر
          <code className="ms-1 rounded bg-muted px-1 py-0.5">x-admin-user-id</code> ارسال کنید.
        </li>
        <li>صفحه را مجدداً بارگذاری کنید تا دسترسی مدیر فعال شود.</li>
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">
        در محیط‌های عملیاتی این میان‌بر غیرفعال است و ورود مدیر از طریق احراز هویت الزامی خواهد بود.
      </p>
    </div>
  );
}

export default async function AdminBillingLayout({
  children,
}: {
  children: ReactNode;
}) {
  let requestLike: { headers: Headers; cookies: ReturnType<typeof cookies> } | null = null;
  try {
    requestLike = { headers: headers(), cookies: cookies() };
  } catch (error) {
    requestLike = null;
  }

  const admin = await ensureAdmin(requestLike);

  if (!admin) {
    if (!DEV_BYPASS_ENABLED) {
      notFound();
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-muted/20">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
        {admin ? children : <DevBypassInstructions />}
      </div>
    </div>
  );
}
