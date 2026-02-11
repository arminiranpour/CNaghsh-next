"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { PersianDatePicker } from "@/components/ui/PersianDatePicker";

import { updateAwards } from "@/lib/profile/profile-actions";

export type AwardEntry = {
  id?: string;
  title: string;
  workTitle?: string | null;
  place?: string | null;
  date?: string | null;
};

type AwardsFormProps = {
  initialAwards: AwardEntry[];
};

export function AwardsForm({ initialAwards }: AwardsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [awards, setAwards] = useState<AwardEntry[]>(() => initialAwards ?? []);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const handleChange =
    (index: number, key: keyof AwardEntry) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setAwards((prev) =>
        prev.map((award, idx) => (idx === index ? { ...award, [key]: value } : award)),
      );
      setFormError(null);
    };

  const handleAdd = () => {
    setAwards((prev) => [
      ...prev,
      {
        title: "",
        workTitle: "",
        place: "",
        date: "",
      },
    ]);
  };

  const handleRemove = (index: number) => {
    setAwards((prev) => prev.filter((_, idx) => idx !== index));
    setFormError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = awards
      .map((award) => ({
        id: award.id ?? null,
        title: (award.title ?? "").trim(),
        workTitle: (award.workTitle ?? "").toString().trim(),
        place: (award.place ?? "").toString().trim(),
        date: (award.date ?? "").toString().trim(),
      }))
      .filter((award) => award.title || award.workTitle || award.place || award.date);

    if (payload.some((award) => !award.title)) {
      setFormError("عنوان جایزه الزامی است.");
      return;
    }

    const formData = new FormData();
    formData.set("awards", JSON.stringify(payload));

    startTransition(() => {
      updateAwards(formData)
        .then((result) => {
          if (result.ok) {
            setFormError(null);
            toast({
              title: "جوایز ذخیره شد.",
              description: "لیست جوایز شما با موفقیت به‌روزرسانی شد.",
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

  return (
    <form className="space-y-6" dir="rtl" onSubmit={handleSubmit}>
      <div className="space-y-4">
        {awards.length === 0 ? (
          <p className="text-sm text-muted-foreground">جایزه‌ای ثبت نشده است.</p>
        ) : (
          awards.map((award, index) => {
            const titleId = `award-title-${award.id ?? "new"}-${index}`;
            const workTitleId = `award-work-${award.id ?? "new"}-${index}`;
            const placeId = `award-place-${award.id ?? "new"}-${index}`;
            const dateId = `award-date-${award.id ?? "new"}-${index}`;

            return (
              <div
                key={`${award.id ?? "new"}-${index}`}
                className="grid gap-4 rounded-md border border-border p-4 shadow-sm lg:grid-cols-[1fr,1fr,1fr,200px,auto]"
              >
                <div className="space-y-2">
                  <Label htmlFor={titleId}>عنوان جایزه</Label>
                  <Input
                    id={titleId}
                    value={award.title ?? ""}
                    onChange={handleChange(index, "title")}
                    placeholder="مثلاً بهترین بازیگر نقش اول"
                    disabled={isPending}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={workTitleId}>عنوان اثر</Label>
                  <Input
                    id={workTitleId}
                    value={award.workTitle ?? ""}
                    onChange={handleChange(index, "workTitle")}
                    placeholder="مثلاً نمایش هملت"
                    disabled={isPending}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={placeId}>محل دریافت</Label>
                  <Input
                    id={placeId}
                    value={award.place ?? ""}
                    onChange={handleChange(index, "place")}
                    placeholder="مثلاً جشنواره تئاتر دانشگاهی"
                    disabled={isPending}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={dateId}>تاریخ (ماه و سال)</Label>
                  <PersianDatePicker
                    id={dateId}
                    value={award.date ?? ""}
                    onChange={(value) =>
                      handleChange(index, "date")({
                        target: { value },
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                  />
                </div>

                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(index)}
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

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={handleAdd} disabled={isPending}>
          افزودن جایزه جدید
        </Button>
      </div>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "در حال ذخیره..." : "ذخیره جوایز"}
        </Button>
      </div>
    </form>
  );
}
