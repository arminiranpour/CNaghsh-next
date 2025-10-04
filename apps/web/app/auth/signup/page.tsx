"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
    const password = (formData.get("password") as string | null) ?? "";

    if (!email || !password) {
      setError("لطفاً ایمیل و رمز عبور را تکمیل کنید.");
      return;
    }

    if (password.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name || undefined,
          email,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.message ?? "خطا در ثبت‌نام. لطفاً بعداً تلاش کنید.");
        setIsSubmitting(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl: "/dashboard",
      });

      if (signInResult?.error) {
        setError(signInResult.error);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      router.push(signInResult?.url ?? "/dashboard");
      router.refresh();
    } catch (err) {
      setError("خطا در برقراری ارتباط با سرور. لطفاً بعداً تلاش کنید.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container flex max-w-md flex-col items-center justify-center py-16">
      <div className="w-full rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-foreground">ثبت‌نام</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">نام</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="نام و نام خانوادگی"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">ایمیل</Label>
            <Input
              id="email"
              name="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">رمز عبور</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="********"
            />
            <p className="text-xs text-muted-foreground">رمز عبور باید حداقل ۸ کاراکتر باشد.</p>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "در حال ثبت‌نام..." : "ثبت‌نام"}
          </Button>
        </form>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        قبلاً حساب ساخته‌اید؟ {" "}
        <Link
          href={{ pathname: "/auth/signin" }}
          className="text-primary hover:underline"
        >
          وارد شوید
        </Link>
      </p>
    </div>
  );
}
