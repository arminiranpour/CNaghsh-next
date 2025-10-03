"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SandboxUserIdPrompt({
  redirectPath,
}: {
  redirectPath: Route;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem("sandboxUserId");
    if (stored) {
      setValue(stored);
    }
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    window.localStorage.setItem("sandboxUserId", trimmed);
    const searchParams = new URLSearchParams({ userId: trimmed });
    const target = `${redirectPath}?${searchParams.toString()}` as Route;
    router.replace(target);    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm font-medium text-foreground" htmlFor="sandbox-user-id">
        شناسه کاربر (برای تست)
      </label>
      <Input
        id="sandbox-user-id"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="cuid..."
        dir="ltr"
      />
      <Button type="submit" className="w-full md:w-auto">
        ذخیره
      </Button>
    </form>
  );
}