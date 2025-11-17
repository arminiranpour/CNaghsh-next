import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth/session";

import { AccountInfoForm } from "./_components/account-info-form";
import { PasswordChangeForm } from "./_components/password-change-form";

export default async function SettingsPage() {
  const session = await getServerAuthSession();

  const userId = session?.user?.id;

  if (!userId) {
    redirect("/auth?tab=signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
    },
  });

  if (!user?.email) {
    redirect("/auth?tab=signin");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>اطلاعات حساب</CardTitle>
          <CardDescription>
            نام نمایشی خود را ویرایش کنید. تغییر ایمیل در حال حاضر امکان‌پذیر نیست.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountInfoForm initialName={user.name ?? ""} email={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تغییر رمز عبور</CardTitle>
          <CardDescription>
            برای امنیت بیشتر، رمز عبور فعلی خود را وارد کرده و رمز جدیدی با حداقل ۸ کاراکتر انتخاب کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>
    </div>
  );
}
