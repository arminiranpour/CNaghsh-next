"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  LANGUAGE_LEVEL_MAX,
  LANGUAGE_OPTIONS,
  type LanguageSkill,
} from "@/lib/profile/languages";

import { updateLanguages } from "../actions";

type LanguageFormEntry = {
  id: string;
  label: string;
  level: number | null;
  isCustom: boolean;
};

type LanguagesFormProps = {
  initialLanguages: LanguageSkill[];
};

const LEVEL_OPTIONS = Array.from({ length: LANGUAGE_LEVEL_MAX }, (_, index) => index + 1);

function buildInitialEntries(initialLanguages: LanguageSkill[]): LanguageFormEntry[] {
  const initialMap = new Map(
    initialLanguages.map((item) => [item.label.trim().toLowerCase(), item.level]),
  );

  const baseEntries: LanguageFormEntry[] = LANGUAGE_OPTIONS.map((option) => ({
    id: option.key,
    label: option.label,
    level: initialMap.get(option.label.trim().toLowerCase()) ?? null,
    isCustom: false,
  }));

  const usedLabels = new Set(baseEntries.map((entry) => entry.label.trim().toLowerCase()));

  const customEntries: LanguageFormEntry[] = initialLanguages
    .filter((item) => !usedLabels.has(item.label.trim().toLowerCase()))
    .map((item, index) => ({
      id: `custom-${index}`,
      label: item.label,
      level: item.level ?? null,
      isCustom: true,
    }));

  return [...baseEntries, ...customEntries];
}

export function LanguagesForm({ initialLanguages }: LanguagesFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [entries, setEntries] = useState<LanguageFormEntry[]>(
    buildInitialEntries(initialLanguages),
  );

  const handleLevelChange = (id: string, value: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? { ...entry, level: value === "none" ? null : Number(value) }
          : entry,
      ),
    );
    setFormError(null);
  };

  const handleLabelChange = (id: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, label: value } : entry)),
    );
    setFormError(null);
  };

  const addCustomLanguage = () => {
    setEntries((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        label: "",
        level: null,
        isCustom: true,
      },
    ]);
    setFormError(null);
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setFormError(null);
  };

  const buildPayload = (): LanguageSkill[] | null => {
    const cleaned: LanguageSkill[] = [];
    const seen = new Set<string>();

    for (const entry of entries) {
      const label = entry.label.trim();

      if (!label || entry.level === null) {
        continue;
      }

      const dedupeKey = label.toLowerCase();

      if (seen.has(dedupeKey)) {
        setFormError("نام زبان‌ها باید یکتا باشد.");
        return null;
      }

      seen.add(dedupeKey);
      cleaned.push({ label, level: entry.level });
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
    formData.set("languages", JSON.stringify(payload));

    startTransition(() => {
      updateLanguages(formData)
        .then((result) => {
          if (result.ok) {
            toast({
              title: "زبان‌ها ذخیره شد.",
              description: "سطوح زبان با موفقیت به‌روزرسانی شد.",
            });
            setFormError(null);
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
      <div className="space-y-4">
        {entries.map((entry) => {
          const selectValue = entry.level ? String(entry.level) : "none";
          return (
            <div
              key={entry.id}
              className="grid gap-4 rounded-md border border-border p-4 shadow-sm sm:grid-cols-[1fr,180px,auto]"
            >
              <div className="space-y-2">
                <Label>نام زبان</Label>
                {entry.isCustom ? (
                  <Input
                    value={entry.label}
                    onChange={handleLabelChange(entry.id)}
                    placeholder="مثلاً آلمانی"
                    maxLength={191}
                    disabled={isPending}
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground">{entry.label}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>سطح (۱ تا {LANGUAGE_LEVEL_MAX})</Label>
                <Select
                  value={selectValue}
                  onValueChange={(value) => handleLevelChange(entry.id, value)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="بدون انتخاب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون انتخاب</SelectItem>
                    {LEVEL_OPTIONS.map((level) => (
                      <SelectItem key={level} value={String(level)}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end justify-end">
                {entry.isCustom ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEntry(entry.id)}
                    disabled={isPending}
                  >
                    حذف
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">اختیاری</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">افزودن زبان جدید</p>
          <p className="text-xs text-muted-foreground">
            زبان‌های فارسی، انگلیسی و ترکی از قبل فهرست شده‌اند.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addCustomLanguage} disabled={isPending}>
          افزودن زبان
        </Button>
      </div>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "در حال ذخیره..." : "ذخیره زبان‌ها"}
        </Button>
      </div>
    </form>
  );
}
