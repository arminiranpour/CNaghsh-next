"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SemesterStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

import type { ActionResult, SemesterFormValues } from "../actions";

type SemesterAction = (values: SemesterFormValues) => Promise<ActionResult<keyof SemesterFormValues>>;

type SemesterFormProps = {
  action: SemesterAction;
  submitLabel: string;
  redirectTo?: string;
  initialValues?: SemesterFormValues;
};

type FormErrors = Partial<Record<keyof SemesterFormValues, string>>;
type SemesterFormState = Omit<
  SemesterFormValues,
  "tuitionAmountIrr" | "lumpSumDiscountAmountIrr" | "installmentCount" | "capacity"
> & {
  tuitionAmountIrr: string;
  lumpSumDiscountAmountIrr: string;
  installmentCount: string;
  capacity: string;
};

const statusOptions: Array<{ value: SemesterStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

const DEFAULT_VALUES: SemesterFormState = {
  title: "",
  startsAt: "",
  endsAt: "",
  tuitionAmountIrr: "0",
  lumpSumDiscountAmountIrr: "0",
  installmentPlanEnabled: false,
  installmentCount: "",
  capacity: "",
  status: "draft",
};

const normalizeDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

const sanitizeNumericInput = (value: string) =>
  normalizeDigits(value).replace(/[^\d]/g, "");

const parseOptionalInt = (value: string) => {
  const normalized = sanitizeNumericInput(value);
  if (!normalized) {
    return null;
  }
  return Number.parseInt(normalized, 10);
};

const parseRequiredInt = (value: string, fallback = 0) => {
  const parsed = parseOptionalInt(value);
  return parsed ?? fallback;
};

const buildSemesterState = (values?: SemesterFormValues): SemesterFormState => ({
  ...DEFAULT_VALUES,
  ...(values ?? {}),
  tuitionAmountIrr:
    typeof values?.tuitionAmountIrr === "number"
      ? String(values.tuitionAmountIrr)
      : DEFAULT_VALUES.tuitionAmountIrr,
  lumpSumDiscountAmountIrr:
    typeof values?.lumpSumDiscountAmountIrr === "number"
      ? String(values.lumpSumDiscountAmountIrr)
      : DEFAULT_VALUES.lumpSumDiscountAmountIrr,
  installmentCount:
    typeof values?.installmentCount === "number"
      ? String(values.installmentCount)
      : DEFAULT_VALUES.installmentCount,
  capacity:
    typeof values?.capacity === "number"
      ? String(values.capacity)
      : DEFAULT_VALUES.capacity,
});

export function SemesterForm({
  action,
  submitLabel,
  redirectTo,
  initialValues,
}: SemesterFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<SemesterFormState>(buildSemesterState(initialValues));
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const payload: SemesterFormValues = {
        ...values,
        tuitionAmountIrr: parseRequiredInt(values.tuitionAmountIrr, 0),
        lumpSumDiscountAmountIrr: parseRequiredInt(values.lumpSumDiscountAmountIrr, 0),
        installmentCount: values.installmentPlanEnabled
          ? parseOptionalInt(values.installmentCount)
          : null,
        capacity: parseOptionalInt(values.capacity),
      };
      const result = await action(payload);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast({ variant: "destructive", description: result.error });
        return;
      }
      setErrors({});
      toast({ description: "Saved." });
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 rounded-md border border-border bg-background p-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={values.title}
            onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
          />
          {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startsAt">Starts At</Label>
            <Input
              id="startsAt"
              type="datetime-local"
              value={values.startsAt}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, startsAt: event.target.value }))
              }
            />
            {errors.startsAt ? (
              <p className="text-xs text-destructive">{errors.startsAt}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endsAt">Ends At</Label>
            <Input
              id="endsAt"
              type="datetime-local"
              value={values.endsAt}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, endsAt: event.target.value }))
              }
            />
            {errors.endsAt ? <p className="text-xs text-destructive">{errors.endsAt}</p> : null}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tuitionAmountIrr">Tuition Amount (IRR)</Label>
          <Input
            id="tuitionAmountIrr"
            type="text"
            inputMode="numeric"
            value={values.tuitionAmountIrr}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                tuitionAmountIrr: sanitizeNumericInput(event.target.value),
              }))
            }
          />
            {errors.tuitionAmountIrr ? (
              <p className="text-xs text-destructive">{errors.tuitionAmountIrr}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lumpSumDiscountAmountIrr">Lump-Sum Discount (IRR)</Label>
          <Input
            id="lumpSumDiscountAmountIrr"
            type="text"
            inputMode="numeric"
            value={values.lumpSumDiscountAmountIrr}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                lumpSumDiscountAmountIrr: sanitizeNumericInput(event.target.value),
              }))
            }
          />
            {errors.lumpSumDiscountAmountIrr ? (
              <p className="text-xs text-destructive">
                {errors.lumpSumDiscountAmountIrr}
              </p>
            ) : null}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity (optional)</Label>
          <Input
            id="capacity"
            type="text"
            inputMode="numeric"
            value={values.capacity ?? ""}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                capacity: sanitizeNumericInput(event.target.value),
              }))
            }
          />
          {errors.capacity ? <p className="text-xs text-destructive">{errors.capacity}</p> : null}
        </div>
        <div className="space-y-4 rounded-md border border-dashed border-border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="installmentPlanEnabled">Installment Plan</Label>
              <p className="text-xs text-muted-foreground">Enable split payments.</p>
            </div>
            <Switch
              id="installmentPlanEnabled"
              checked={values.installmentPlanEnabled}
              onCheckedChange={(checked) =>
                setValues((prev) => ({
                  ...prev,
                  installmentPlanEnabled: checked,
                  installmentCount: checked ? prev.installmentCount || "2" : "",
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="installmentCount">Installment Count</Label>
            <Input
              id="installmentCount"
              type="text"
              inputMode="numeric"
              disabled={!values.installmentPlanEnabled}
              value={values.installmentCount ?? ""}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  installmentCount: sanitizeNumericInput(event.target.value),
                }))
              }
            />
            {errors.installmentCount ? (
              <p className="text-xs text-destructive">{errors.installmentCount}</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={values.status}
            onValueChange={(value: SemesterStatus) =>
              setValues((prev) => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
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
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
