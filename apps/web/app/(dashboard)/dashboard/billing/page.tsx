import { unstable_noStore as noStore } from "next/cache";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBillingDashboardData } from "@/lib/billing/dashboard";
import { getServerAuthSession } from "@/lib/auth/session";

import {
  renewSubscriptionAction,
  setCancelAtPeriodEndAction,
} from "./actions";

import { BillingDashboardClient } from "./_components/billing-dashboard-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BillingPage() {
  noStore();
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>ورود موردنیاز است</CardTitle>
            <CardDescription>
              برای مشاهده اطلاعات صورتحساب، ابتدا وارد حساب کاربری خود شوید.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              پس از ورود، وضعیت اشتراک، تاریخچه پرداخت و دسترسی‌های فعال شما نمایش داده خواهد شد.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = await getBillingDashboardData(session.user.id);

  return (
    <BillingDashboardClient
      initialData={data}
      actions={{
        setCancelAtPeriodEnd: setCancelAtPeriodEndAction,
        renewSubscription: renewSubscriptionAction,
      }}
    />
  );
}
