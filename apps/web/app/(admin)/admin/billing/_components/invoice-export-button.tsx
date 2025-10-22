"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

function buildHref(query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && value.length > 0 && key !== "page") {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return `/api/admin/invoices/export${qs ? `?${qs}` : ""}`;
}

type Props = {
  query: Record<string, string | undefined>;
};

export function InvoiceExportButton({ query }: Props) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleClick = () => {
    startTransition(() => {
      const url = buildHref(query);
      fetch(url)
        .then(async (response) => {
          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            const message =
              (payload && typeof payload.error === "string" && payload.error) || "دانلود CSV ناموفق بود.";
            throw new Error(message);
          }
          const blob = await response.blob();
          const href = window.URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = href;
          anchor.download = "invoices.csv";
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          window.URL.revokeObjectURL(href);
        })
        .catch((error: unknown) => {
          toast({ variant: "destructive", title: "خطا", description: error instanceof Error ? error.message : undefined });
        });
    });
  };

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
      خروجی CSV
    </Button>
  );
}
