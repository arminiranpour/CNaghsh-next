import Link from "next/link";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";

import { PlansTable } from "./plans-table";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    cycle: plan.cycle,
    productId: plan.productId,
    productName: plan.product?.name ?? "-",
    active: plan.active,
    createdAt: plan.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">پلن‌ها</h2>
          <p className="text-sm text-muted-foreground">
            چرخه‌های اشتراک را مدیریت و ویرایش کنید.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/billing/plans/new">ایجاد پلن</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          هنوز پلنی ساخته نشده است.
        </div>
      ) : (
        <PlansTable plans={rows} />
      )}
    </div>
  );
}