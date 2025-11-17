import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JobForm } from "@/components/dashboard/jobs/JobForm";
import { getServerAuthSession } from "@/lib/auth/session";
import { getCities } from "@/lib/location/cities";
import { prisma } from "@/lib/prisma";

type EditJobPageProps = {
  params: { id: string };
};

export default async function EditJobPage({ params }: EditJobPageProps) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/auth?tab=signin");
  }

  const job = await prisma.job.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      cityId: true,
      payType: true,
      payAmount: true,
      currency: true,
      remote: true,
    },
  });

  if (!job) {
    notFound();
  }

  const cities = await getCities();

  return (
    <div className="mx-auto max-w-3xl space-y-6" dir="rtl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">ویرایش آگهی</h1>
        <p className="text-sm text-muted-foreground">
          تغییرات خود را اعمال کرده و ذخیره نمایید.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جزئیات آگهی</CardTitle>
          <CardDescription>اطلاعات آگهی را به‌روزرسانی کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <JobForm
            mode="edit"
            jobId={job.id}
            cities={cities}
            initialValues={{
              title: job.title,
              description: job.description,
              category: job.category,
              cityId: job.cityId ?? "",
              payType: job.payType ?? "",
              payAmount: job.payAmount,
              currency: job.currency ?? "",
              remote: job.remote,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
