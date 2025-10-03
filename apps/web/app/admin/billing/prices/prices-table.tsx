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

import { togglePriceActive } from "./actions";

type PriceRow = {
  id: string;
  formattedAmount: string;
  active: boolean;
  createdAt: string;
  linkType: "plan" | "product";
  linkLabel: string;
};

const linkTypeLabel: Record<PriceRow["linkType"], string> = {
  plan: "پلن",
  product: "محصول",
};

export function PricesTable({ prices }: { prices: PriceRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">شناسه</TableHead>
            <TableHead>مبلغ</TableHead>
            <TableHead>متعلق به</TableHead>
            <TableHead>وضعیت</TableHead>
            <TableHead>تاریخ ایجاد</TableHead>
            <TableHead className="w-40 text-left">اقدامات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prices.map((price) => (
            <TableRow key={price.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {price.id}
              </TableCell>
              <TableCell className="font-medium">{price.formattedAmount}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge variant="secondary">{linkTypeLabel[price.linkType]}</Badge>
                  <div className="text-xs text-muted-foreground">{price.linkLabel}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={price.active ? "success" : "outline"}>
                  {price.active ? "فعال" : "غیرفعال"}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(price.createdAt).toLocaleDateString("fa-IR")}
              </TableCell>
              <TableCell className="space-x-2 space-x-reverse text-left">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/billing/prices/${price.id}/edit`}>ویرایش</Link>
                </Button>
                <TogglePriceButton id={price.id} active={price.active} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TogglePriceButton({ id, active }: { id: string; active: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await togglePriceActive(id);
      if (result?.error) {
        toast({ variant: "destructive", description: result.error });
        return;
      }

      toast({ description: active ? "قیمت غیرفعال شد." : "قیمت فعال شد." });
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