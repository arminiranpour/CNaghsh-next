"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AuthCard() {
  return (
    <Card className="w-full max-w-md rounded-2xl">
      <CardHeader>
        <h1 className="text-xl font-semibold text-center">ورود به حساب</h1>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm">ایمیل</label>
          <Input type="email" placeholder="you@example.com" />
        </div>
        <div className="space-y-1">
          <label className="text-sm">رمز عبور</label>
          <Input type="password" placeholder="••••••••" />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button className="w-full">ورود</Button>
        <a href="/auth/signup" className="text-sm text-muted-foreground underline text-center">
          حساب ندارید؟ ثبت‌نام
        </a>
      </CardFooter>
    </Card>
  )
}
