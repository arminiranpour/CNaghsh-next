"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils";

type UserMenuProps = {
  email: string;
};

function getInitials(email: string) {
  if (!email) {
    return "؟";
  }

  const [localPart] = email.split("@");
  const cleaned = localPart.replace(/[^\p{L}\p{N}]/gu, "");

  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2).toUpperCase();
  }

  if (cleaned.length === 1) {
    return cleaned.toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
}

export function UserMenu({ email }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold",
          open && "ring-2 ring-ring"
        )}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {getInitials(email)}
      </button>
      {open ? (
        <div className="absolute left-0 mt-2 w-44 rounded-md border border-border bg-popover text-popover-foreground shadow-md focus:outline-none">
          <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground ltr:text-left rtl:text-right">
            {email}
          </div>
          <nav className="flex flex-col py-1 text-sm">
            <Link
              href={{ pathname: "/dashboard" }}
              className="px-4 py-2 text-right transition-colors hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              پروفایل من
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2 text-right text-destructive transition-colors hover:bg-destructive/10"
            >
              خروج
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
