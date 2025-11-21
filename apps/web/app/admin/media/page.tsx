import { requireAdminSession } from "@/lib/auth/admin";
import { AdminMediaHealthOverview } from "@/components/admin/media/AdminMediaHealthOverview";
import { AdminMediaStats } from "@/components/admin/media/AdminMediaStats";
import { AdminMediaTable } from "@/components/admin/media/AdminMediaTable";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  await requireAdminSession();

  return (
    <div className="space-y-8" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">مدیریت رسانه‌ها</h1>
        <p className="text-sm text-muted-foreground">
          تمامی ویدیوها و تصاویر بارگذاری‌شده را مشاهده، فیلتر و مدیریت کنید. وضعیت پردازش، نمایش و نتیجه بررسی هر رسانه در اینجا قابل دسترسی است.
        </p>
      </header>

      <section>
        <AdminMediaHealthOverview />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">آمار کلی</h2>
        <p className="text-sm text-muted-foreground">نمایی سریع از وضعیت پردازش و مدیریت محتوایی در روزهای اخیر.</p>
        <AdminMediaStats />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">لیست رسانه‌ها</h2>
          <p className="text-sm text-muted-foreground">از فیلترها برای یافتن سریع رسانه‌ها استفاده کنید و با منوی عملیات، اقدامات لازم را انجام دهید.</p>
        </div>
        <AdminMediaTable />
      </section>
    </div>
  );
}
