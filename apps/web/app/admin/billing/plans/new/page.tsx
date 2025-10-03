import { ProductType } from "@prisma/client";

import { prisma } from "@/lib/db";

import { createPlan } from "../actions";
import { PlanForm } from "../plan-form";

export default async function NewPlanPage() {
  const products = await prisma.product.findMany({
    where: { type: ProductType.SUBSCRIPTION, active: true },
    orderBy: { createdAt: "asc" },
  });

  const productOptions = products.map((product) => ({
    id: product.id,
    name: product.name,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">ایجاد پلن</h2>
        <p className="text-sm text-muted-foreground">
          پلن جدیدی برای محصولات اشتراک فعال بسازید.
        </p>
      </div>
      <PlanForm products={productOptions} action={createPlan} submitLabel="ذخیره" />
    </div>
  );
}