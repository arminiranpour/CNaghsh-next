"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

import { toggleProductActive } from "./actions";

type ProductRow = {
  id: string;
  name: string;
  type: "SUBSCRIPTION" | "JOB_POST";
  active: boolean;
  createdAt: string;
};

const typeLabels: Record<ProductRow["type"], string> = {
  SUBSCRIPTION: "اشتراک",
  JOB_POST: "ثبت آگهی",
};

export function ProductsTable({ products }: { products: ProductRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">شناسه</TableHead>
            <TableHead>نام</TableHead>
            <TableHead>نوع</TableHead>
            <TableHead>وضعیت</TableHead>
            <TableHead>تاریخ ایجاد</TableHead>
            <TableHead className="w-40 text-left">اقدامات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {product.id}
              </TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{typeLabels[product.type]}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={product.active ? "success" : "outline"}>
                  {product.active ? "فعال" : "غیرفعال"}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(product.createdAt).toLocaleDateString("fa-IR")}
              </TableCell>
              <TableCell className="space-x-2 space-x-reverse text-left">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/billing/products/${product.id}/edit`}>
                    ویرایش
                  </Link>
                </Button>
                <ToggleProductButton id={product.id} active={product.active} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ToggleProductButton({ id, active }: { id: string; active: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await toggleProductActive(id);
      if (result?.error) {
        toast({ variant: "destructive", description: result.error });
        return;
      }

      toast({ description: active ? "محصول غیرفعال شد." : "محصول فعال شد." });
      router.refresh();
    });
  };

  return (
    <Button
      variant={active ? "secondary" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? "در حال اجرا..." : active ? "غیرفعال" : "فعال"}
    </Button>
  );
}