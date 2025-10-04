import Link from "next/link";
import type { ComponentProps } from "react";
import { getServerSession } from "next-auth/next";

import { getAuthConfig } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";

import { UserMenu } from "./user-menu";

export type NavigationItem = {
  href: ComponentProps<typeof Link>["href"];
  label: string;
};

export async function Header({ navigation }: { navigation: NavigationItem[] }) {
  const session = await getServerSession(getAuthConfig(prisma));

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href={{ pathname: "/" }}
          className="text-lg font-semibold text-foreground"
        >
          صحنه
        </Link>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-6 text-sm font-medium">
            {navigation.map((item) => (
              <Link
                key={
                  typeof item.href === "string"
                    ? item.href
                    : item.href.pathname ?? JSON.stringify(item.href)
                }
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {session?.user ? (
            <UserMenu email={session.user.email ?? ""} />
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <Link
                href={{ pathname: "/auth/signin" }}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                ورود
              </Link>
              <Link
                href={{ pathname: "/auth/signup" }}
                className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                ثبت‌نام
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
