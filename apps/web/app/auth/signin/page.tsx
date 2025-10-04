"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (!errorParam) {
      setError(null);
      return;
    }

    const messages: Record<string, string> = {
      CredentialsSignin: "ایمیل یا رمز عبور نادرست است.",
      AccessDenied: "دسترسی شما مجاز نیست.",
    };

    setError(messages[errorParam] ?? "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
    const password = (formData.get("password") as string | null) ?? "";

    if (!email || !password) {
      setError("لطفاً تمام فیلدها را تکمیل کنید.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    if (result?.url) {
      router.push(result.url);
      router.refresh();
    }
  }

  return (
    <div className="container flex max-w-md flex-col items-center justify-center py-16">
      <div className="w-full rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-foreground">ورود</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              required
              placeholder="********"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "در حال ورود..." : "ورود"}
          </Button>
        </form>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        حساب ندارید؟ {" "}
        <Link
          href={{ pathname: "/auth/signup" }}
          className="text-primary hover:underline"
        >
          همین حالا ثبت‌نام کنید
        </Link>
      </p>
    </div>
  );
}
