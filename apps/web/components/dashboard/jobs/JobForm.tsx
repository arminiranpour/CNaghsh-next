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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import type { City } from "@/lib/location/cities";

import {
  createJobAction,
  type FormActionResult,
  type JobFormInput,
  updateJobAction,
} from "@/app/(dashboard)/dashboard/jobs/actions";

const SUCCESS_MESSAGES = {
  create: "پیش‌نویس آگهی ذخیره شد.",
  edit: "آگهی به‌روزرسانی شد.",
} as const;

const GENERIC_ERROR_MESSAGE = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";

type JobFormProps = {
  mode: "create" | "edit";
  jobId?: string;
  cities: City[];
  initialValues: {
    title: string;
    description: string;
    category: string;
    cityId?: string | null;
    payType?: string | null;
    payAmount?: number | null;
    currency?: string | null;
    remote: boolean;
  };
};

type FieldErrors = Partial<Record<keyof JobFormInput, string>>;

export function JobForm({ mode, jobId, cities, initialValues }: JobFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState({
    title: initialValues.title ?? "",
    description: initialValues.description ?? "",
    category: initialValues.category ?? "",
    cityId: initialValues.cityId ?? "",
    payType: initialValues.payType ?? "",
    payAmount:
      initialValues.payAmount !== null && initialValues.payAmount !== undefined
        ? String(initialValues.payAmount)
        : "",
    currency: initialValues.currency ?? "",
    remote: initialValues.remote ?? false,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const updateValue = (field: keyof typeof values) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      setValues((prev) => ({ ...prev, [field]: nextValue }));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      setFormError(null);
    };

  const handleSelectChange = (field: "cityId" | "payType") => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setFormError(null);
  };

  const handleRemoteChange = (checked: boolean) => {
    setValues((prev) => ({ ...prev, remote: checked }));
    setFieldErrors((prev) => ({ ...prev, remote: undefined }));
    setFormError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: JobFormInput = {
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category.trim(),
      cityId: values.cityId.trim() ? values.cityId.trim() : undefined,
      payType: values.payType.trim() ? values.payType.trim() : undefined,
      payAmount: values.payAmount.trim(),
      currency: values.currency.trim() ? values.currency.trim() : undefined,
      remote: values.remote,
    };

    startTransition(() => {
      if (mode === "edit" && !jobId) {
        setFormError(GENERIC_ERROR_MESSAGE);
        toast({
          variant: "destructive",
          title: "خطا",
          description: GENERIC_ERROR_MESSAGE,
        });
        return;
      }

      const action =
        mode === "create"
          ? createJobAction(payload)
          : updateJobAction(jobId ?? "", payload);

      action
        .then((result: FormActionResult) => {
          if (result.ok) {
            setFieldErrors({});
            setFormError(null);
            toast({
              title: SUCCESS_MESSAGES[mode],
            });
            if (mode === "create") {
              router.push("/dashboard/jobs");
              router.refresh();
            } else {
              router.refresh();
            }
          } else {
            if (result.fieldErrors) {
              setFieldErrors(result.fieldErrors);
            } else {
              setFieldErrors({});
            }
            if (result.error) {
              setFormError(result.error);
              toast({
                variant: "destructive",
                title: "خطا",
                description: result.error,
              });
            } else {
              setFormError(null);
            }
          }
        })
        .catch(() => {
          setFormError(GENERIC_ERROR_MESSAGE);
          toast({
            variant: "destructive",
            title: "خطا",
            description: GENERIC_ERROR_MESSAGE,
          });
        });
    });
  };

  return (
    <form className="space-y-6" dir="rtl" onSubmit={handleSubmit}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">عنوان آگهی</Label>
          <Input
            id="title"
            value={values.title}
            onChange={updateValue("title")}
            maxLength={140}
            required
            disabled={isPending}
            placeholder="مثلاً بازیگر تئاتر"
          />
          {fieldErrors.title ? (
            <p className="text-sm text-destructive">{fieldErrors.title}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">دسته‌بندی</Label>
          <Input
            id="category"
            value={values.category}
            onChange={updateValue("category")}
            maxLength={64}
            required
            disabled={isPending}
            placeholder="مثلاً تئاتر"
          />
          {fieldErrors.category ? (
            <p className="text-sm text-destructive">{fieldErrors.category}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">توضیحات آگهی</Label>
        <Textarea
          id="description"
          value={values.description}
          onChange={updateValue("description")}
          required
          disabled={isPending}
          rows={6}
          placeholder="شرح کامل پروژه و شرایط همکاری را وارد کنید."
        />
        {fieldErrors.description ? (
          <p className="text-sm text-destructive">{fieldErrors.description}</p>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>شهر</Label>
          <Select
            value={values.cityId}
            onValueChange={(value) => handleSelectChange("cityId")(value)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="انتخاب شهر" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="">بدون انتخاب</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.cityId ? (
            <p className="text-sm text-destructive">{fieldErrors.cityId}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="payType">نوع پرداخت (اختیاری)</Label>
          <Input
            id="payType"
            value={values.payType}
            onChange={updateValue("payType")}
            maxLength={32}
            disabled={isPending}
            placeholder="مثلاً پروژه‌ای یا ساعتی"
          />
          {fieldErrors.payType ? (
            <p className="text-sm text-destructive">{fieldErrors.payType}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payAmount">مبلغ پرداخت (اختیاری)</Label>
          <Input
            id="payAmount"
            type="text"
            inputMode="numeric"
            value={values.payAmount}
            onChange={updateValue("payAmount")}
            disabled={isPending}
            placeholder="مثلاً ۵۰۰۰۰۰۰"
          />
          {fieldErrors.payAmount ? (
            <p className="text-sm text-destructive">{fieldErrors.payAmount}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">ارز (اختیاری)</Label>
          <Input
            id="currency"
            value={values.currency}
            onChange={(event) => {
              const nextValue = event.target.value.toUpperCase();
              setValues((prev) => ({ ...prev, currency: nextValue }));
              setFieldErrors((prev) => ({ ...prev, currency: undefined }));
              setFormError(null);
            }}
            maxLength={3}
            disabled={isPending}
            placeholder="مثلاً IRR"
          />
          {fieldErrors.currency ? (
            <p className="text-sm text-destructive">{fieldErrors.currency}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/30 p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">امکان همکاری از راه دور</p>
          <p className="text-xs text-muted-foreground">
            در صورت فعال بودن، آگهی به عنوان فرصت دورکاری نمایش داده می‌شود.
          </p>
          {fieldErrors.remote ? (
            <p className="text-sm text-destructive">{fieldErrors.remote}</p>
          ) : null}
        </div>
        <Switch
          checked={values.remote}
          onCheckedChange={handleRemoteChange}
          disabled={isPending}
        />
      </div>

      {formError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {mode === "create" ? "ذخیره پیش‌نویس" : "ذخیره تغییرات"}
        </Button>
      </div>
    </form>
  );
}

