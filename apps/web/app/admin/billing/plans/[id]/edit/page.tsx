import { notFound } from "next/navigation";
import { ProductType } from "@prisma/client";

import { prisma } from "@/lib/db";

import { updatePlan } from "../../actions";
import { PlanForm } from "../../plan-form";

const stringifyLimits = (value: unknown) => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch (error) {
    return "{}";
  }
};

export default async function EditPlanPage({
  params,
}: {
  params: { id: string };
}) {
  const plan = await prisma.plan.findUnique({
    where: { id: params.id },
  });

  if (!plan) {
    notFound();
  }

  const products = await prisma.product.findMany({
    where: { type: ProductType.SUBSCRIPTION },
    orderBy: { createdAt: "asc" },
  });

  const productOptions = products.map((product) => ({
    id: product.id,
    name: product.name,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">ویرایش پلن</h2>
        <p className="text-sm text-muted-foreground">
          اطلاعات پلن را بروزرسانی کنید.
        </p>
      </div>
      <PlanForm
        products={productOptions}
        initialValues={{
          name: plan.name,
          productId: plan.productId,
          cycle: plan.cycle,
          active: plan.active,
          limitsText: stringifyLimits(plan.limits),
        }}
        action={updatePlan.bind(null, plan.id)}
        submitLabel="ذخیره"
      />
    </div>
  );
}