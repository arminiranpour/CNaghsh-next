"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import { updateExperience } from "@/lib/profile/profile-actions";

type ExperienceEntry = {
  role: string;
  work: string;
};

export type ExperienceFormValues = {
  theatre: ExperienceEntry[];
  shortFilm: ExperienceEntry[];
  cinema: ExperienceEntry[];
  tv: ExperienceEntry[];
};

type ExperienceCategoryKey = keyof ExperienceFormValues;

const CATEGORY_CONFIG: Array<{ key: ExperienceCategoryKey; label: string }> = [
  { key: "theatre", label: "تئاتر" },
  { key: "shortFilm", label: "فیلم کوتاه" },
  { key: "cinema", label: "سینمایی" },
  { key: "tv", label: "تلویزیون" },
];

const EMPTY_ENTRY: ExperienceEntry = { role: "", work: "" };

type ExperienceFormProps = {
  initialValues: ExperienceFormValues;
};

export function ExperienceForm({ initialValues }: ExperienceFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [values, setValues] = useState<ExperienceFormValues>({
    theatre: initialValues.theatre ?? [],
    shortFilm: initialValues.shortFilm ?? [],
    cinema: initialValues.cinema ?? [],
    tv: initialValues.tv ?? [],
  });

  const normalizeEntries = (entries: ExperienceEntry[]): ExperienceEntry[] =>
    entries
      .map((entry) => ({
        role: entry.role.trim(),
        work: entry.work.trim(),
      }))
      .filter((entry) => entry.role !== "" || entry.work !== "");

  const buildPayload = (): ExperienceFormValues => ({
    theatre: normalizeEntries(values.theatre),
    shortFilm: normalizeEntries(values.shortFilm),
    cinema: normalizeEntries(values.cinema),
    tv: normalizeEntries(values.tv),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = buildPayload();
    const hasPartial = Object.values(payload).some((entries) =>
      entries.some((entry) => !entry.role || !entry.work),
    );

    if (hasPartial) {
      setFormError("لطفاً نقش و نام اثر را برای همه موارد وارد کنید.");
      return;
    }

    const formData = new FormData();
    formData.set("experience", JSON.stringify(payload));

    startTransition(() => {
      updateExperience(formData)
        .then((result) => {
          if (result.ok) {
            setFormError(null);
            setValues(payload);
            toast({
              title: "تجربه‌ها ذخیره شد.",
              description: "لیست تجربه‌های شما به‌روزرسانی شد.",
            });
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

  const addEntry = (category: ExperienceCategoryKey) => {
    setValues((prev) => ({
      ...prev,
      [category]: [...prev[category], { ...EMPTY_ENTRY }],
    }));
    setFormError(null);
  };

  const removeEntry = (category: ExperienceCategoryKey, index: number) => {
    setValues((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
    setFormError(null);
  };

  const handleInputChange =
    (category: ExperienceCategoryKey, index: number, field: keyof ExperienceEntry) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setValues((prev) => {
        const nextEntries = [...prev[category]];
        nextEntries[index] = { ...nextEntries[index], [field]: value };
        return { ...prev, [category]: nextEntries };
      });
      setFormError(null);
    };

  return (
    <form className="space-y-6" dir="rtl" onSubmit={handleSubmit}>
      {CATEGORY_CONFIG.map((category) => {
        const entries = values[category.key];
        return (
          <div
            key={category.key}
            className="space-y-4 rounded-md border border-border p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base font-semibold">{category.label}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addEntry(category.key)}
                disabled={isPending}
              >
                افزودن مورد جدید
              </Button>
            </div>

            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                هنوز موردی برای این بخش ثبت نشده است.
              </p>
            ) : (
              <div className="space-y-4">
                {entries.map((entry, index) => {
                  const roleId = `${category.key}-role-${index}`;
                  const workId = `${category.key}-work-${index}`;
                  return (
                    <div
                      key={`${category.key}-${index}`}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      <div className="space-y-2">
                        <Label htmlFor={roleId}>نقش</Label>
                        <Input
                          id={roleId}
                          value={entry.role}
                          onChange={handleInputChange(category.key, index, "role")}
                          placeholder="مثلاً نقش اصلی"
                          disabled={isPending}
                          maxLength={191}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={workId}>نام اثر</Label>
                        <Input
                          id={workId}
                          value={entry.work}
                          onChange={handleInputChange(category.key, index, "work")}
                          placeholder="نام اثر / نمایش"
                          disabled={isPending}
                          maxLength={191}
                        />
                      </div>
                      <div className="flex justify-end sm:col-span-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEntry(category.key, index)}
                          disabled={isPending}
                        >
                          حذف
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "در حال ذخیره..." : "ذخیره تجربه‌ها"}
        </Button>
      </div>
    </form>
  );
}
