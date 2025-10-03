import Link from "next/link";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";

import { ProductsTable } from "./products-table";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows = products.map((product) => ({
    id: product.id,
    name: product.name,
    type: product.type,
    active: product.active,
    createdAt: product.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">محصولات</h2>
          <p className="text-sm text-muted-foreground">
            محصولات فعال و غیرفعال را مدیریت کنید.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/billing/products/new">ایجاد محصول</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          هنوز محصولی ثبت نشده است.
        </div>
      ) : (
        <ProductsTable products={rows} />
      )}
    </div>
  );
}