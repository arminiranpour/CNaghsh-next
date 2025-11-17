"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { User, Mail, Phone, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";


type LoginFormProps = {
  callbackUrl?: string;
  onPasswordPhaseChange?: (isActive: boolean) => void;
};

type AuthMode = "register" | "login";

export function LoginForm({
  callbackUrl,
  onPasswordPhaseChange,
}: LoginFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>("register");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleFirstStep = () => {
    if (!formData.email) {
      setError("لطفاً ایمیل را وارد کنید.");
      return;
    }

    if (mode === "register") {
      if (!formData.username || !formData.phone) {
        setError("لطفاً تمام فیلدها را تکمیل کنید.");
        return;
      }
    }

    setShowPasswordStep(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!showPasswordStep) {
      handleFirstStep();
      return;
    }

    // Password step submission
    if (mode === "register") {
      if (!formData.password || !formData.confirmPassword) {
        setError("لطفاً رمز عبور و تکرار آن را وارد کنید.");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("رمز عبور و تکرار آن یکسان نیست.");
        return;
      }

      if (formData.password.length < 8) {
        setError("رمز عبور باید حداقل ۸ کاراکتر باشد.");
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.username || undefined,
            email: formData.email.toLowerCase().trim(),
            password: formData.password,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            data?.message ?? "خطا در ثبت‌نام. لطفاً کمی بعد دوباره امتحان کنید.";
          setError(message);
          setIsSubmitting(false);
          return;
        }

        const signInResult = await signIn("credentials", {
          redirect: false,
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          callbackUrl: callbackUrl ?? "/dashboard",
        });

        if (signInResult?.error) {
          const fallbackMessage =
            signInResult.error === "CredentialsSignin"
              ? "ایمیل یا رمز عبور نادرست است."
              : signInResult.error ?? "خطایی رخ داد. لطفاً دوباره تلاش کنید.";
          setError(fallbackMessage);
          setIsSubmitting(false);
          return;
        }

        toast({
          title: "ثبت‌نام موفق",
          description: "حساب شما با موفقیت ایجاد و وارد شدید.",
        });

        setIsSubmitting(false);
        const destination = signInResult?.url ?? callbackUrl ?? "/dashboard";
        router.push(destination);
        router.refresh();
      } catch (err) {
        setError("خطا در ارتباط با سرور. بعداً تلاش کنید.");
        setIsSubmitting(false);
      }
    } else {
      // Login mode
      if (!formData.password) {
        setError("لطفاً رمز عبور را وارد کنید.");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        callbackUrl: callbackUrl ?? "/dashboard",
      });

      setIsSubmitting(false);

      if (result?.error) {
        const fallback =
          result.error === "CredentialsSignin"
            ? "ایمیل یا رمز عبور نادرست است."
            : result.error;
        setError(fallback);
        return;
      }

      const destination = result?.url ?? callbackUrl ?? "/dashboard";
      router.push(destination);
      router.refresh();
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await signIn("google", {
        callbackUrl: callbackUrl ?? "/dashboard",
        redirect: true,
      });
    } catch (err) {
      setError("خطا در ورود با گوگل. لطفاً دوباره تلاش کنید.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6" dir="rtl">
        <div
    className="
      bg-white
      rounded-[22px]
      w-[564px]
      h-[634px]
      p-10
      shadow-[0_4px_30px_rgba(0,0,0,0.1)]
      flex
      flex-col
      justify-center
    "
  >
      {/* Welcome Message */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-black">خوش آمدید!</h1>
        <p className="text-sm text-black">
          لطفا اطلاعات خودتون رو وارد کنید.
        </p>
      </div>
{/* Toggle Switch */}
<div className="relative bg-[#D9D9D9] rounded-full p-2 flex gap-2 mb-4">
  <button
    type="button"
    onClick={() => {
      setMode("register");
      setError(null);
      setShowPasswordStep(false);
      setFormData({
        username: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });
    }}
    className={cn(
      "flex-1 rounded-full px-6 py-3 text-base font-semibold transition-colors duration-200",
      mode === "register"
        ? "bg-black text-white"
        : "bg-transparent text-black"
    )}
  >
    ثبت نام
  </button>

  <button
    type="button"
    onClick={() => {
      setMode("login");
      setError(null);
      setShowPasswordStep(false);
      setFormData({
        username: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });
    }}
    className={cn(
      "flex-1 rounded-full px-6 py-3 text-base font-semibold transition-colors duration-200",
      mode === "login"
        ? "bg-black text-white"
        : "bg-transparent text-black"
    )}
  >
    ورود
  </button>
</div>



      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username Field */}
        {mode === "register" && (
          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
              <div className="bg-muted rounded-md p-2 flex items-center justify-center">
                <User className="h-5.5 w-8 text-foreground" />
              </div>
            </div>
            <Input
              type="text"
              placeholder="نام کاربری"
              value={formData.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              className="pr-5 bg-white/50 border-muted rounded-lg"
              required={mode === "register"}
            />
          </div>
        )}

        {/* Email Field */}
        {!showPasswordStep && (
          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
              <div className="bg-muted rounded-md p-2 flex items-center justify-center">
                <Mail className="h-5.5 w-8 text-foreground" />
              </div>
            </div>
            <Input
              type="email"
              placeholder="ایمیل"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="pr-5 bg-white/50 border-muted rounded-lg"
              dir="trl"
              required
              onFocus={() => onPasswordPhaseChange?.(true)}
              onBlur={() => onPasswordPhaseChange?.(false)}
            />
          </div>
        )}

        {/* Phone Field */}
        {mode === "register" && !showPasswordStep && (
          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
              <div className="bg-muted rounded-md p-2 flex items-center justify-center">
                <Phone className="h-5.5 w-8 text-foreground" />
              </div>
            </div>
            <Input
              type="tel"
              placeholder="شماره تلفن"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              className="pr-5 bg-white/50 border-muted rounded-lg"
              dir="rtl"
              required={mode === "register"}
            />
          </div>
        )}

        {/* Password Fields - Show after first step */}
        {showPasswordStep && (
          <>
            <div className="relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                <div className="bg-muted rounded-md p-2 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-foreground" />
                </div>
              </div>
              <Input
                type="password"
                placeholder="رمز عبور"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="pr-12 bg-muted/50 border-muted rounded-lg"
                required
                onFocus={() => onPasswordPhaseChange?.(true)}
                onBlur={() => onPasswordPhaseChange?.(false)}
              />
            </div>
            {mode === "register" && (
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                  <div className="bg-muted rounded-md p-2 flex items-center justify-center">
                    <Lock className="h-4 w-4 text-foreground" />
                  </div>
                </div>
                <Input
                  type="password"
                  placeholder="تکرار رمز عبور"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className="pr-12 bg-muted/50 border-muted rounded-lg"
                  required
                  onFocus={() => onPasswordPhaseChange?.(true)}
                  onBlur={() => onPasswordPhaseChange?.(false)}
                />
              </div>
            )}
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-sm text-destructive text-center">{error}</div>
        )}

        {/* Continue Button */}
        <div className="flex gap-2">
          {showPasswordStep && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPasswordStep(false);
                setError(null);
              }}
              className="flex-1 rounded-lg"
            >
              بازگشت
            </Button>
          )}
          <Button
            type="submit"
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg h-11 text-base font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "در حال پردازش..."
              : showPasswordStep
                ? mode === "register"
                  ? "ثبت نام"
                  : "ورود"
                : "ادامه"}
          </Button>
        </div>
      </form>

      {/* Google Sign In */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="flex items-center gap-2 hover:text-foreground transition-colors disabled:opacity-50"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span>با اکانت گوگل وارد شوید.</span>
        </button>
      </div>
    </div>
    </div>
  );
}

