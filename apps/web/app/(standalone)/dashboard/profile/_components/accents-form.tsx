"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import { updateAccents } from "@/lib/profile/profile-actions";

type AccentsFormProps = {
  initialAccents: string[];
};

export function AccentsForm({ initialAccents }: AccentsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [values, setValues] = useState<string[]>(initialAccents ?? []);

  const handleChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setFormError(null);
  };

  const addAccent = () => {
    setValues((prev) => [...prev, ""]);
    setFormError(null);
  };

  const removeAccent = (index: number) => {
    setValues((prev) => prev.filter((_, idx) => idx !== index));
    setFormError(null);
  };

  const buildPayload = (): string[] | null => {
    const cleaned: string[] = [];
    const seen = new Set<string>();

    for (const entry of values) {
      const accent = entry.trim();

      if (!accent) {
        continue;
      }

      const dedupeKey = accent.toLowerCase();

      if (seen.has(dedupeKey)) {
        setFormError("لهجه‌ها باید یکتا باشند.");
        return null;
      }

      seen.add(dedupeKey);
      cleaned.push(accent);
    }

    return cleaned;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = buildPayload();

    if (!payload) {
      return;
    }

    const formData = new FormData();
    formData.set("accents", JSON.stringify(payload));

    startTransition(() => {
      updateAccents(formData)
        .then((result) => {
          if (result.ok) {
            toast({
              title: "لهجه‌ها ذخیره شد.",
              description: "لیست لهجه‌ها با موفقیت به‌روزرسانی شد.",
            });
            setFormError(null);
            setValues(payload);
            router.refresh();
          } else {
            setFormError(result.error ?? "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
          }
        })
        .catch(() => {
          setFormError("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
        });
    });
  };

  return (
    <form className="space-y-6" dir="rtl" onSubmit={handleSubmit}>
      <div className="space-y-3">
        {values.length === 0 ? (
          <p className="text-sm text-muted-foreground">لهجه‌ای ثبت نشده است.</p>
        ) : (
          values.map((accent, index) => {
            const inputId = `accent-${index}`;
            return (
              <div
                key={inputId}
                className="grid items-end gap-3 rounded-md border border-border p-4 shadow-sm sm:grid-cols-[1fr,auto]"
              >
                <div className="space-y-2">
                  <Label htmlFor={inputId}>لهجه</Label>
                  <Input
                    id={inputId}
                    value={accent}
                    onChange={handleChange(index)}
                    placeholder="مثلاً تهرانی، آذری، شیرازی"
                    maxLength={100}
                    disabled={isPending}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAccent(index)}
                    disabled={isPending}
                  >
                    حذف
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">افزودن لهجه جدید</p>
          <p className="text-xs text-muted-foreground">هر مورد را به صورت جداگانه وارد کنید.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addAccent} disabled={isPending}>
          افزودن لهجه
        </Button>
      </div>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "در حال ذخیره..." : "ذخیره لهجه‌ها"}
        </Button>
      </div>
    </form>
  );
}
