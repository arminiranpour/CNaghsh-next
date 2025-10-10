"use client"

import { useState } from "react"
import { User, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"register" | "login">("register")

  return (
    <div className="relative min-h-screen overflow-hidden font-sans" dir="rtl">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d9488] via-[#14b8a6] to-[#2dd4bf]">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image.png-sKSq6t24cY56VIOusGeMO5hEBGPfgD.jpeg"
          alt="Background"
          className="h-full w-full object-cover opacity-90"
        />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-[2rem] bg-white/20 p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-4xl font-bold text-white">خوش آمدید!</h1>
            <p className="text-sm text-white/90">لطفا اطلاعات خودتون رو وارد کنید.</p>
          </div>

          <div className="mb-6 flex gap-2 rounded-full bg-[#0f766e] p-2">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 rounded-full px-6 py-3 text-sm font-medium transition-all ${
                activeTab === "login" ? "bg-[#0f766e] text-white" : "bg-transparent text-white/80 hover:text-white"
              }`}
            >
              ورود
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`flex-1 rounded-full px-6 py-3 text-sm font-medium transition-all ${
                activeTab === "register"
                  ? "bg-[#06b6d4] text-white shadow-lg"
                  : "bg-transparent text-white/80 hover:text-white"
              }`}
            >
              ثبت نام
            </button>
          </div>

          <div className="mb-6 space-y-4">
            {/* Username input */}
            <div className="relative">
              <input
                type="text"
                placeholder="نام کاربری"
                className="w-full rounded-full border-2 border-white/40 bg-transparent px-12 py-3 text-right text-white placeholder:text-white/60 focus:border-white/60 focus:outline-none"
              />
              <div className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#0f766e]">
                <User className="h-4 w-4 text-white" />
              </div>
            </div>

            {/* Email input */}
            <div className="relative">
              <input
                type="email"
                placeholder="ایمیل یا شماره تلفن"
                className="w-full rounded-full border-2 border-white/40 bg-transparent px-12 py-3 text-right text-white placeholder:text-white/60 focus:border-white/60 focus:outline-none"
              />
              <div className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#0f766e]">
                <Mail className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          <Button className="mb-6 w-full rounded-full bg-white py-6 text-base font-semibold text-black hover:bg-white/90">
            ادامه
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/30"></div>
            </div>
          </div>

          <button className="flex w-full items-center justify-center gap-3 rounded-full bg-transparent py-3 text-sm text-white/90 transition-colors hover:bg-white/10">
            <span>یا اکانت گوگل وارد شوید...</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
