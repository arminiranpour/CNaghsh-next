import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JobForm } from "@/components/dashboard/jobs/JobForm";
import { getServerAuthSession } from "@/lib/auth/session";
import { getCities } from "@/lib/location/cities";

export default async function NewJobPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/auth?tab=signin");
  }

  const cities = await getCities();

  return (
    <div className="mx-auto max-w-3xl space-y-6" dir="rtl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">ایجاد آگهی جدید</h1>
        <p className="text-sm text-muted-foreground">
          اطلاعات آگهی را تکمیل کنید و به صورت پیش‌نویس ذخیره نمایید.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جزئیات آگهی</CardTitle>
          <CardDescription>
            عنوان، توضیحات و شرایط همکاری را وارد کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobForm
            mode="create"
            cities={cities}
            initialValues={{
              title: "",
              description: "",
              category: "",
              cityId: "",
              payType: "",
              payAmount: null,
              currency: "",
              remote: false,
              introVideoMediaId: "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
