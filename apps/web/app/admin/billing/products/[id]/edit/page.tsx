import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";

import { updateProduct } from "../../actions";
import { ProductForm } from "../../product-form";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">ویرایش محصول</h2>
        <p className="text-sm text-muted-foreground">
          مشخصات محصول را بروزرسانی کنید.
        </p>
      </div>
      <ProductForm
        initialValues={{
          name: product.name,
          type: product.type,
          active: product.active,
        }}
        action={updateProduct.bind(null, product.id)}
        submitLabel="ذخیره"
      />
    </div>
  );
}