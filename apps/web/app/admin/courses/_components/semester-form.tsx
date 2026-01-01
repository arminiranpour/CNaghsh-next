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

const statusOptions: Array<{ value: SemesterStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

const DEFAULT_VALUES: SemesterFormValues = {
  title: "",
  startsAt: "",
  endsAt: "",
  tuitionAmountIrr: 0,
  lumpSumDiscountAmountIrr: 0,
  installmentPlanEnabled: false,
  installmentCount: null,
  capacity: null,
  status: "draft",
};

export function SemesterForm({
  action,
  submitLabel,
  redirectTo,
  initialValues,
}: SemesterFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<SemesterFormValues>(initialValues ?? DEFAULT_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await action(values);
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
              type="number"
              min={0}
              value={values.tuitionAmountIrr}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  tuitionAmountIrr: Number(event.target.value),
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
              type="number"
              min={0}
              value={values.lumpSumDiscountAmountIrr}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  lumpSumDiscountAmountIrr: Number(event.target.value),
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
            type="number"
            min={0}
            value={values.capacity ?? ""}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                capacity: event.target.value ? Number(event.target.value) : null,
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
                  installmentCount: checked ? prev.installmentCount ?? 2 : null,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="installmentCount">Installment Count</Label>
            <Input
              id="installmentCount"
              type="number"
              min={2}
              disabled={!values.installmentPlanEnabled}
              value={values.installmentCount ?? ""}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  installmentCount: event.target.value
                    ? Number(event.target.value)
                    : null,
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
