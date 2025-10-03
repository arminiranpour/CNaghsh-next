import { notFound } from "next/navigation";
import { ProductType } from "@prisma/client";

import { prisma } from "@/lib/db";

import { updatePrice } from "../../actions";
import { PriceForm } from "../../price-form";

export default async function EditPricePage({
  params,
}: {
  params: { id: string };
}) {
  const price = await prisma.price.findUnique({
    where: { id: params.id },
    include: {
      plan: { include: { product: true } },
      product: true,
    },
  });

  if (!price) {
    notFound();
  }

  const plans = await prisma.plan.findMany({
    where: {
      product: {
        type: ProductType.SUBSCRIPTION,
      },
    },
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });

  const jobProducts = await prisma.product.findMany({
    where: { type: ProductType.JOB_POST },
    orderBy: { createdAt: "asc" },
  });

  const planOptions = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    productName: plan.product?.name,
  }));

  const productOptions = jobProducts.map((product) => ({
    id: product.id,
    name: product.name,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">ویرایش قیمت</h2>
        <p className="text-sm text-muted-foreground">
          مبلغ و مقصد این قیمت را بروزرسانی کنید.
        </p>
      </div>
      <PriceForm
        plans={planOptions}
        products={productOptions}
        initialValues={{
          amount: price.amount,
          mode: price.planId ? "plan" : "product",
          planId: price.planId,
          productId: price.productId,
          active: price.active,
        }}
        action={updatePrice.bind(null, price.id)}
        submitLabel="ذخیره"
      />
    </div>
  );
}