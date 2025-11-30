"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ProfilesSearchBarProps = {
  initialQuery?: string;
  className?: string;
};

export function ProfilesSearchBar({ initialQuery = "", className }: ProfilesSearchBarProps) {
  const [value, setValue] = useState(initialQuery);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  const applySearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const trimmed = value.trim();

    if (trimmed) {
      params.set("query", trimmed);
    } else {
      params.delete("query");
    }
    params.delete("page");

    const next = params.toString();
    router.push(next ? `/profiles?${next}` : "/profiles");
  };

  return (
    <form onSubmit={applySearch} className={cn("w-full", className)} role="search" dir="rtl">
      <div className="mx-auto flex w-full max-w-4xl items-center gap-3 rounded-full border border-border bg-white/90 px-4 py-2 shadow-sm backdrop-blur">
        <Input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="جستجوی نام بازیگر"
          className="h-12 flex-1 rounded-full border-none bg-transparent text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button
          type="submit"
          variant="secondary"
          className="h-11 rounded-full bg-muted px-6 text-base font-semibold text-foreground hover:bg-muted/80"
        >
          جستجو
        </Button>
      </div>
    </form>
  );
}
