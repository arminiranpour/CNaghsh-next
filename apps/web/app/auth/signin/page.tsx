"use client";

import type { Route } from "next";
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
      router.push(result.url as Route);
      router.refresh();
    }
  }

  return (
<div className="min-h-screen flex items-center justify-center bg-[#e8e8e8] p-4" dir="rtl">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">خوش آمدید!</h1>
          <p className="text-white/70 text-lg md:text-xl">لطفا اطلاعات خودتون رو وارد کنید</p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#4a6b6b] rounded-full p-2 mb-6 flex">
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-4 px-8 rounded-full text-lg font-semibold transition-all ${
              activeTab === "register" ? "bg-[#8ef5e8] text-black" : "bg-transparent text-black"
            }`}
          >
            ثبت نام
          </button>
          <button
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-4 px-8 rounded-full text-lg font-semibold transition-all ${
              activeTab === "login" ? "bg-[#8ef5e8] text-black" : "bg-transparent text-black"
            }`}
          >
            ورود
          </button>
        </div>

        {/* Username Input */}
        <div className="mb-4 flex items-center gap-3">
          <div className="bg-[#4a6b6b] rounded-2xl p-4 flex items-center justify-center">
            <User className="w-7 h-7 text-white" />
          </div>
          <input
            type="text"
            placeholder="نام کاربری"
            className="flex-1 bg-white/90 rounded-2xl px-6 py-5 text-right text-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8ef5e8]"
          />
        </div>

        {/* Email/Phone Input */}
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-[#4a6b6b] rounded-2xl p-4 flex items-center justify-center">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <input
            type="text"
            placeholder="ایمیل یا شماره تلفن"
            className="flex-1 bg-white/90 rounded-2xl px-6 py-5 text-right text-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8ef5e8]"
          />
        </div>

        {/* Continue Button */}
        <button className="w-full bg-white rounded-2xl py-5 text-black text-xl font-bold mb-8 hover:bg-white/95 transition-colors">
          ادامه
        </button>

        {/* Footer Text with Google Icon */}
        <div className="flex items-center justify-center gap-3 text-white/60">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="text-base">ثبت نام به معنای قبول وارد شدن است</span>
        </div>
      </div>
    </div>
  );
}
