import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServerAuthSession } from "@/lib/auth/session";

import type { Route } from "next";

const quickLinks = [
  { href: "/dashboard/profile", label: "پروفایل", description: "اطلاعات فردی و حرفه‌ای" },
  { href: "/dashboard/billing", label: "صورتحساب", description: "اشتراک‌ها و پرداخت‌ها" },
  { href: "/dashboard/settings", label: "تنظیمات", description: "نام و رمز عبور" },
] satisfies Array<{ href: Route; label: string; description: string }>;

export default async function DashboardPage() {
  const session = await getServerAuthSession();
  const email = session?.user?.email ?? "—";

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">خوش آمدید</h2>
        <p className="text-sm text-muted-foreground">
          در این بخش می‌توانید وضعیت حساب خود را دنبال کرده و به تنظیمات مهم دسترسی پیدا کنید.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>اطلاعات ورود</CardTitle>
          <CardDescription>آدرس ایمیل شما برای ورود و اعلان‌ها استفاده می‌شود.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <span className="text-muted-foreground">ایمیل</span>
            <div className="rounded-md border border-dashed bg-muted/50 px-3 py-2 font-medium" dir="ltr">
              {email}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        {quickLinks.map((item) => (
          <Card key={item.href}>
            <CardHeader>
              <CardTitle className="text-lg">{item.label}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="secondary">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
