"use client";

import { useEffect, useState, useTransition, type ReactNode, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

type SubmitHandler<T> = (input: T & { reason: string }) => Promise<{ ok: boolean; error?: string }>;

type ActionDialogProps<T extends Record<string, unknown>> = {
  title: string;
  description: string;
  triggerLabel: string;
  confirmLabel: string;
  variant?: "default" | "outline" | "destructive" | "secondary";
  loadingLabel?: string;
  reasonPlaceholder?: string;
  input: T;
  reasonLabel?: string;
  children?: (params: {
    values: Record<string, unknown>;
    onChange: (patch: Record<string, unknown>) => void;
  }) => ReactNode;
  onSubmit: SubmitHandler<T>;
};

export function ActionDialog<T extends Record<string, unknown>>({
  title,
  description,
  triggerLabel,
  confirmLabel,
  loadingLabel = "در حال انجام...",
  reasonPlaceholder = "دلیل را وارد کنید...",
  variant = "outline",
  input,
  reasonLabel = "دلیل عملیات",
  children,
  onSubmit,
}: ActionDialogProps<T>) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>(input);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setValues(input);
    } else {
      setReason("");
    }
  }, [open, input]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast({ variant: "destructive", description: "وارد کردن دلیل الزامی است." });
      return;
    }

    startTransition(async () => {
      const result = await onSubmit({ ...(values as T), reason: trimmedReason });
      if (!result?.ok) {
        toast({ variant: "destructive", description: result?.error ?? "خطا در انجام عملیات." });
        return;
      }

      toast({ description: "عملیات با موفقیت ثبت شد." });
      setOpen(false);
      setReason("");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)} disabled={isPending}>
        {triggerLabel}
      </Button>
      <DialogContent dir="rtl" asChild>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="reason-input">
              {reasonLabel}
            </label>
            <Textarea
              id="reason-input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={reasonPlaceholder}
              minLength={5}
              maxLength={2000}
              rows={4}
              dir="rtl"
              required
            />
          </div>
          {children ? children({ values, onChange: (patch) => setValues((prev) => ({ ...prev, ...patch })) }) : null}
          <DialogFooter className="justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              انصراف
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? loadingLabel : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
