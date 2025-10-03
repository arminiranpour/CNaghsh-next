"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

import type { createProduct } from "./actions";

type ProductAction = typeof createProduct;

type ProductTypeValue = "SUBSCRIPTION" | "JOB_POST";

const productTypeOptions: Array<{ value: ProductTypeValue; label: string }> = [
  { value: "SUBSCRIPTION", label: "اشتراک" },
  { value: "JOB_POST", label: "ثبت آگهی" },
];

type ProductFormValues = {
  name: string;
  type: ProductTypeValue;
  active: boolean;
};

type ProductFormProps = {
  initialValues?: ProductFormValues;
  action: ProductAction | ((values: ProductFormValues) => ReturnType<ProductAction>);
  submitLabel: string;
};

type FormErrors = Partial<Record<keyof ProductFormValues, string>>;

const DEFAULT_VALUES: ProductFormValues = {
  name: "",
  type: "SUBSCRIPTION",
  active: true,
};

export function ProductForm({ initialValues, action, submitLabel }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<ProductFormValues>(initialValues ?? DEFAULT_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!values.name.trim()) {
      nextErrors.name = "مقدار نامعتبر";
    }

    if (!values.type) {
      nextErrors.type = "مقدار نامعتبر";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast({
        variant: "destructive",
        description: "لطفاً خطاهای فرم را برطرف کنید.",
      });
      return;
    }

    setErrors({});

    startTransition(async () => {
      const result = await action({
        name: values.name.trim(),
        type: values.type,
        active: values.active,
      });

      if (result?.error) {
        toast({ variant: "destructive", description: result.error });
        return;
      }

      toast({ description: "با موفقیت ذخیره شد." });
      router.push("/admin/billing/products");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="name">نام</Label>
            <Input
              id="name"
              name="name"
              value={values.name}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="نام محصول"
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>نوع</Label>
            <Select
              value={values.type}
              onValueChange={(value: ProductTypeValue) =>
                setValues((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="نوع محصول" />
              </SelectTrigger>
              <SelectContent>
                {productTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type ? (
              <p className="text-xs text-destructive">{errors.type}</p>
            ) : null}
          </div>
          <div className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2">
            <div>
              <Label htmlFor="active">فعال</Label>
              <p className="text-xs text-muted-foreground">
                غیرفعال کردن موجب حذف از لیست‌ها می‌شود.
              </p>
            </div>
            <Switch
              id="active"
              checked={values.active}
              onCheckedChange={(checked) =>
                setValues((prev) => ({ ...prev, active: checked }))
              }
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "در حال ذخیره..." : submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}