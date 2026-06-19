"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChallengeStatus } from "@prisma/client";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import type { ActionResult, ChallengeFormValues } from "../actions";

type ChallengeAction = (
  values: ChallengeFormValues,
) => Promise<ActionResult<keyof ChallengeFormValues>>;

type ChallengeFormProps = {
  action: ChallengeAction;
  submitLabel: string;
  redirectTo?: string;
  initialValues?: ChallengeFormValues;
  showStatus?: boolean;
};

type FieldErrors = Partial<Record<keyof ChallengeFormValues, string>>;

type ChallengeFormState = Omit<ChallengeFormValues, "mediaLengthLimitSec" | "priceIrr"> & {
  mediaLengthLimitSec: string;
  priceIrr: string;
};

const statusOptions: Array<{ value: ChallengeStatus; label: string }> = [
  { value: "draft", label: "پیش‌نویس" },
  { value: "published", label: "منتشرشده" },
  { value: "archived", label: "آرشیوشده" },
];

const DEFAULT_VALUES: ChallengeFormState = {
  title: "",
  location: "",
  summary: "",
  startDate: "",
  endDate: "",
  conditions: "",
  mediaLengthLimitSec: "",
  instructions: "",
  priceIrr: "0",
  prerequisite: "",
  howHeld: "",
  sideNote: "",
  status: "draft",
};

const normalizeDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));

const sanitizeNumericInput = (value: string) => normalizeDigits(value).replace(/[^\d]/g, "");

const parseOptionalInt = (value: string) => {
  const normalized = sanitizeNumericInput(value);
  if (!normalized) {
    return null;
  }
  return Number.parseInt(normalized, 10);
};

const parseRequiredInt = (value: string, fallback = 0) => {
  const normalized = sanitizeNumericInput(value);
  if (!normalized) {
    return fallback;
  }
  return Number.parseInt(normalized, 10);
};

const buildState = (values?: ChallengeFormValues): ChallengeFormState => ({
  ...DEFAULT_VALUES,
  ...(values ?? {}),
  mediaLengthLimitSec:
    typeof values?.mediaLengthLimitSec === "number" ? String(values.mediaLengthLimitSec) : "",
  priceIrr: typeof values?.priceIrr === "number" ? String(values.priceIrr) : "0",
});

export function ChallengeForm({
  action,
  submitLabel,
  redirectTo,
  initialValues,
  showStatus = false,
}: ChallengeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<ChallengeFormState>(buildState(initialValues));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await action({
        ...values,
        mediaLengthLimitSec: parseOptionalInt(values.mediaLengthLimitSec),
        priceIrr: parseRequiredInt(values.priceIrr, 0),
      });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast({
          variant: "destructive",
          description: result.error,
        });
        return;
      }

      setErrors({});
      toast({ description: "با موفقیت ذخیره شد." });
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      <div className="grid gap-6 rounded-md border border-border bg-background p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">عنوان</Label>
            <Input
              id="title"
              value={values.title}
              onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
            />
            {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">محل برگزاری</Label>
            <Input
              id="location"
              value={values.location}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, location: event.target.value }))
              }
            />
            {errors.location ? (
              <p className="text-xs text-destructive">{errors.location}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary">خلاصه کوتاه</Label>
          <Textarea
            id="summary"
            rows={4}
            value={values.summary}
            onChange={(event) => setValues((prev) => ({ ...prev, summary: event.target.value }))}
          />
          {errors.summary ? <p className="text-xs text-destructive">{errors.summary}</p> : null}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startDate">تاریخ شروع</Label>
            <Input
              id="startDate"
              type="date"
              value={values.startDate}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, startDate: event.target.value }))
              }
            />
            {errors.startDate ? (
              <p className="text-xs text-destructive">{errors.startDate}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">تاریخ پایان</Label>
            <Input
              id="endDate"
              type="date"
              value={values.endDate}
              onChange={(event) => setValues((prev) => ({ ...prev, endDate: event.target.value }))}
            />
            {errors.endDate ? <p className="text-xs text-destructive">{errors.endDate}</p> : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="conditions">شرایط شرکت</Label>
          <Textarea
            id="conditions"
            rows={4}
            value={values.conditions}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, conditions: event.target.value }))
            }
          />
          {errors.conditions ? (
            <p className="text-xs text-destructive">{errors.conditions}</p>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mediaLengthLimitSec">حداکثر مدت ویدیو (ثانیه)</Label>
            <Input
              id="mediaLengthLimitSec"
              value={values.mediaLengthLimitSec}
              inputMode="numeric"
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  mediaLengthLimitSec: sanitizeNumericInput(event.target.value),
                }))
              }
            />
            {errors.mediaLengthLimitSec ? (
              <p className="text-xs text-destructive">{errors.mediaLengthLimitSec}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceIrr">قیمت (ریال)</Label>
            <Input
              id="priceIrr"
              value={values.priceIrr}
              inputMode="numeric"
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  priceIrr: sanitizeNumericInput(event.target.value),
                }))
              }
            />
            {errors.priceIrr ? <p className="text-xs text-destructive">{errors.priceIrr}</p> : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">توضیحات و راهنما</Label>
          <Textarea
            id="instructions"
            rows={6}
            value={values.instructions}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, instructions: event.target.value }))
            }
          />
          {errors.instructions ? (
            <p className="text-xs text-destructive">{errors.instructions}</p>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="prerequisite">پیش‌نیاز</Label>
            <Textarea
              id="prerequisite"
              rows={3}
              value={values.prerequisite}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, prerequisite: event.target.value }))
              }
            />
            {errors.prerequisite ? (
              <p className="text-xs text-destructive">{errors.prerequisite}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="howHeld">نحوه برگزاری</Label>
            <Input
              id="howHeld"
              value={values.howHeld}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, howHeld: event.target.value }))
              }
              placeholder="مثلاً آنلاین، حضوری، ترکیبی"
            />
            {errors.howHeld ? (
              <p className="text-xs text-destructive">{errors.howHeld}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sideNote">یادداشت جانبی</Label>
          <Textarea
            id="sideNote"
            rows={3}
            value={values.sideNote ?? ""}
            onChange={(event) => setValues((prev) => ({ ...prev, sideNote: event.target.value }))}
          />
          {errors.sideNote ? <p className="text-xs text-destructive">{errors.sideNote}</p> : null}
        </div>

        {showStatus ? (
          <div className="space-y-2">
            <Label>وضعیت</Label>
            <Select
              value={values.status ?? "draft"}
              onValueChange={(value: ChallengeStatus) =>
                setValues((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب وضعیت" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status ? <p className="text-xs text-destructive">{errors.status}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "در حال ذخیره..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
