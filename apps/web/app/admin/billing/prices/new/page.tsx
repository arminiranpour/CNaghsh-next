import { ProductType } from "@prisma/client";

import { prisma } from "@/lib/db";

import { createPrice } from "../actions";
import { PriceForm } from "../price-form";

export default async function NewPricePage() {
  const plans = await prisma.plan.findMany({
    where: {
      active: true,
      product: {
        active: true,
        type: ProductType.SUBSCRIPTION,
      },
    },
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });

  const jobProducts = await prisma.product.findMany({
    where: { active: true, type: ProductType.JOB_POST },
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
        <h2 className="text-xl font-semibold">ایجاد قیمت</h2>
        <p className="text-sm text-muted-foreground">
          مبلغ را وارد و مشخص کنید این قیمت برای پلن یا محصول تکی است.
        </p>
      </div>
      <PriceForm
        plans={planOptions}
        products={productOptions}
        action={createPrice}
        submitLabel="ذخیره"
      />
    </div>
  );
}