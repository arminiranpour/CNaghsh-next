"use client";

import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { SKILLS, type SkillKey } from "@/lib/profile/skills";

import { updateSkills } from "../actions";

type SkillsFormProps = {
  initialSkills: SkillKey[];
};

type SkillsState = {
  selections: Set<SkillKey>;
};

export function SkillsForm({ initialSkills }: SkillsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<SkillsState>({
    selections: new Set(initialSkills),
  });
  const [error, setError] = useState<string | null>(null);

  const groupedSkills = useMemo(() => {
    type SkillItem = (typeof SKILLS)[number];
    const groups = new Map<string, SkillItem[]>();
    for (const skill of SKILLS) {
      if (!groups.has(skill.category)) {
        groups.set(skill.category, []);
      }
      groups.get(skill.category)!.push(skill);
    }
    return Array.from(groups.entries());
  }, []);

  const toggleSkill = (key: SkillKey) => {
    setState((prev) => {
      const nextSelections = new Set(prev.selections);
      if (nextSelections.has(key)) {
        nextSelections.delete(key);
      } else {
        nextSelections.add(key);
      }
      return { selections: nextSelections };
    });
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData();
    for (const key of state.selections) {
      formData.append("skills", key);
    }

    startTransition(() => {
      updateSkills(formData)
        .then((result) => {
          if (result.ok) {
            toast({
              title: "مهارت‌ها ذخیره شد.",
              description: "لیست مهارت‌ها با موفقیت به‌روزرسانی شد.",
            });
            setError(null);
            router.refresh();
          } else {
            setError(result.error ?? "خطایی رخ داد.");
          }
        })
        .catch(() => {
          setError("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
        });
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-4" dir="rtl">
        {groupedSkills.map(([category, skills]) => (
          <div key={category} className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">
              {category === "acting"
                ? "بازیگری"
                : category === "voice"
                  ? "صدا و خوانندگی"
                  : category === "dance"
                    ? "رقص"
                    : category === "music"
                      ? "موسیقی"
                      : category === "production"
                        ? "تولید و پشت صحنه"
                        : category === "visual"
                          ? "تصویر"
                          : category === "post"
                            ? "پس‌تولید"
                            : category}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {skills.map((skill) => {
                const checked = state.selections.has(skill.key);
                return (
                  <label
                    key={skill.key}
                    className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-background px-4 py-2 text-sm shadow-sm transition hover:border-primary"
                  >
                    <span>{skill.label}</span>
                    <input
                      type="checkbox"
                      name="skills"
                      value={skill.key}
                      checked={checked}
                      onChange={() => toggleSkill(skill.key)}
                      className="h-4 w-4"
                      disabled={isPending}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "در حال ذخیره..." : "ذخیره مهارت‌ها"}
        </Button>
      </div>
    </form>
  );
}
