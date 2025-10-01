import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const placeholderCastings = Array.from({ length: 6 });

export default function CastingsPage() {
  return (
    <section className="container space-y-8 py-16">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-bold">مرور فراخوان‌های فعال</h1>
        <p className="text-muted-foreground">
          به زودی می‌توانید فیلترها و دسته‌بندی‌های پیشرفته را برای پیدا کردن پروژه مناسب خود استفاده کنید.
        </p>
      </header>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {placeholderCastings.map((_, index) => (
          <Card key={index} className="h-full">
            <CardHeader>
              <CardTitle>عنوان فراخوان {index + 1}</CardTitle>
              <CardDescription>توضیحات کوتاه در مورد فرصت همکاری.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>نوع پروژه: مشخص می‌شود</li>
                <li>محل تولید: در حال تعیین</li>
                <li>مهلت ارسال رزومه: به زودی</li>
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}