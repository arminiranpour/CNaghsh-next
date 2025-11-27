"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import { updateDegrees } from "../actions";

type DegreeEntry = {
  id: string;
  degreeLevel: string;
  major: string;
};

type DegreesFormProps = {
  initialDegrees: { degreeLevel: string; major: string }[];
};

function buildInitialEntries(values: DegreesFormProps["initialDegrees"]): DegreeEntry[] {
  return (values ?? []).map((entry, index) => ({
    id: `degree-${index}`,
    degreeLevel: entry.degreeLevel ?? "",
    major: entry.major ?? "",
  }));
}

export function DegreesForm({ initialDegrees }: DegreesFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [entries, setEntries] = useState<DegreeEntry[]>(buildInitialEntries(initialDegrees));

  const handleChange =
    (id: string, field: "degreeLevel" | "major") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setEntries((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
      );
      setFormError(null);
    };

  const addRow = () => {
    setEntries((prev) => [
      ...prev,
      {
        id: `degree-${Date.now()}-${prev.length}`,
        degreeLevel: "",
        major: "",
      },
    ]);
    setFormError(null);
  };

  const removeRow = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setFormError(null);
  };

  const buildPayload = (): { degreeLevel: string; major: string }[] => {
    const cleaned: { degreeLevel: string; major: string }[] = [];

    for (const entry of entries) {
      const degreeLevel = entry.degreeLevel.trim();
      const major = entry.major.trim();

      if (!degreeLevel && !major) {
        continue;
      }

      cleaned.push({ degreeLevel, major });
    }

    return cleaned;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = buildPayload();
    const formData = new FormData();
    formData.set("degrees", JSON.stringify(payload));

    startTransition(() => {
      updateDegrees(formData)
        .then((result) => {
          if (result.ok) {
            toast({
              title: "تحصیلات ذخیره شد.",
              description: "مقطع‌های تحصیلی با موفقیت به‌روزرسانی شد.",
            });
            setFormError(null);
            setEntries(payload.map((entry, index) => ({ ...entry, id: `degree-${index}` })));
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
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">مقطع تحصیلی ثبت نشده است.</p>
        ) : (
          entries.map((entry) => {
            const degreeId = `${entry.id}-degree`;
            const majorId = `${entry.id}-major`;

            return (
              <div
                key={entry.id}
                className="grid items-end gap-3 rounded-md border border-border p-4 shadow-sm sm:grid-cols-[1fr,1fr,auto]"
              >
                <div className="space-y-2">
                  <Label htmlFor={degreeId}>مقطع تحصیلی</Label>
                  <Input
                    id={degreeId}
                    value={entry.degreeLevel}
                    onChange={handleChange(entry.id, "degreeLevel")}
                    placeholder="مثلاً کارشناسی، کارشناسی ارشد"
                    maxLength={100}
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={majorId}>رشته تحصیلی</Label>
                  <Input
                    id={majorId}
                    value={entry.major}
                    onChange={handleChange(entry.id, "major")}
                    placeholder="مثلاً کارگردانی"
                    maxLength={100}
                    disabled={isPending}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(entry.id)}
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
          <p className="text-sm font-medium text-foreground">افزودن مقطع جدید</p>
          <p className="text-xs text-muted-foreground">هر مورد را به صورت جداگانه وارد کنید.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={isPending}>
          افزودن مقطع جدید
        </Button>
      </div>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "در حال ذخیره..." : "ذخیره"}
        </Button>
      </div>
    </form>
  );
}
