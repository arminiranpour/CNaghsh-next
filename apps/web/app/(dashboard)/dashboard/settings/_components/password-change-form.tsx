"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import { changePassword } from "../actions";

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

const INITIAL_STATE: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

export function PasswordChangeForm() {
  const [values, setValues] = useState<PasswordFormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const updateField = (field: keyof PasswordFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
      if (error) {
        setError(null);
      }
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(() => {
      changePassword(formData)
        .then((result) => {
          if (result?.ok) {
            setError(null);
            setValues(INITIAL_STATE);
            form.reset();
            toast({
              title: "رمز عبور با موفقیت تغییر کرد.",
              description: "برای ورود بعدی از رمز جدید استفاده کنید.",
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
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            dir="ltr"
            value={values.currentPassword}
            onChange={updateField("currentPassword")}
            autoComplete="current-password"
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">رمز عبور جدید</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            dir="ltr"
            value={values.newPassword}
            onChange={updateField("newPassword")}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmNewPassword">تکرار رمز عبور جدید</Label>
          <Input
            id="confirmNewPassword"
            name="confirmNewPassword"
            type="password"
            dir="ltr"
            value={values.confirmNewPassword}
            onChange={updateField("confirmNewPassword")}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={isPending}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "در حال تغییر..." : "ذخیره رمز عبور"}
        </Button>
      </div>
    </form>
  );
}
