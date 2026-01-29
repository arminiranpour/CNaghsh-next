"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

type MovieDeleteButtonProps = {
  movieId: string;
  label?: string;
  variant?: "ghost" | "outline" | "default" | "destructive";
  redirectTo?: string;
};

export function MovieDeleteButton({
  movieId,
  label = "حذف",
  variant = "ghost",
  redirectTo,
}: MovieDeleteButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm("آیا از حذف این فیلم مطمئن هستید؟");
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/movies/${movieId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as
        | { ok: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        toast({
          variant: "destructive",
          description: payload?.error ?? "حذف فیلم ناموفق بود.",
        });
        return;
      }

      toast({ description: "فیلم حذف شد." });
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    });
  };

  return (
    <Button type="button" variant={variant} size="sm" disabled={isPending} onClick={handleDelete}>
      {isPending ? "در حال حذف..." : label}
    </Button>
  );
}
