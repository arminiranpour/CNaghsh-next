"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import { updateName } from "../actions";

type AccountInfoFormProps = {
  initialName?: string;
  email: string;
};

export function AccountInfoForm({ initialName = "", email }: AccountInfoFormProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const sanitizedName = name.trim();
    formData.set("name", sanitizedName);

    startTransition(() => {
      updateName(formData)
        .then((result) => {
          if (result?.ok) {
            setError(null);
            setName(sanitizedName);
            toast({
              title: "اطلاعات حساب به‌روزرسانی شد.",
              description: "نام شما با موفقیت ذخیره شد.",
            });
          } else {
            setError(result?.error ?? "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
          }
        })
        .catch(() => {
          setError("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
        });
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">ایمیل</Label>
        <div
          className="rounded-md border border-dashed bg-muted/50 px-3 py-2 text-sm"
          dir="ltr"
        >
          {email}
        </div>
        <p className="text-xs text-muted-foreground">
          تغییر ایمیل در حال حاضر امکان‌پذیر نیست.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">نام و نام خانوادگی</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => {
            if (error) {
              setError(null);
            }
            setName(event.target.value);
          }}
          placeholder="نام خود را وارد کنید"
          autoComplete="name"
          maxLength={191}
          required
          disabled={isPending}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
      </div>
    </form>
  );
}
