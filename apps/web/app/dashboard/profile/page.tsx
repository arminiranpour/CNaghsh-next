import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>پروفایل کاربری</CardTitle>
          <CardDescription>
            ویرایش پروفایل در فاز بعدی اضافه می‌شود. در حال حاضر می‌توانید سایر بخش‌های پنل را بررسی کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" disabled>
              تکمیل اطلاعات پایه
            </Button>
            <Button variant="outline" disabled>
              افزودن نمونه‌کار
            </Button>
            <Button variant="ghost" disabled>
              مدیریت شبکه‌های اجتماعی
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
