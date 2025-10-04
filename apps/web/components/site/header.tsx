import Link from "next/link";
import type { ComponentProps } from "react";
import { getServerSession } from "next-auth";

import { getAuthConfig } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";

import { UserMenu } from "./user-menu";

function resolveNavigationHref(
  href: NavigationItem["href"]
): ComponentProps<typeof Link>["href"] {
  if (typeof href !== "object" || href === null) {
    return href;
  }

  if (!("pathname" in href) || typeof href.pathname !== "string") {
    return href;
  }

  const { pathname } = href;
  const dynamicSegments = [...pathname.matchAll(/\[([^/]+?)\]/g)];

  if (dynamicSegments.length === 0) {
    return href;
  }

  const paramsFromHref =
    "params" in href && href.params && typeof href.params === "object"
      ? (href.params as Record<string, unknown>)
      : {};
  const queryFromHref =
    "query" in href && href.query && typeof href.query === "object"
      ? (href.query as Record<string, unknown>)
      : {};

  let resolvedPathname = pathname;
  const consumedKeys = new Set<string>();

  for (const match of dynamicSegments) {
    const paramName = match[1];
    const rawValue =
      paramsFromHref[paramName] !== undefined
        ? paramsFromHref[paramName]
        : queryFromHref[paramName];

    if (rawValue === undefined) {
      throw new Error(
        `Navigation link is missing a value for dynamic segment "${paramName}" in pathname "${pathname}".`
      );
    }

    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

    resolvedPathname = resolvedPathname.replace(
      match[0],
      encodeURIComponent(String(value))
    );
    consumedKeys.add(paramName);
  }

  const searchParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(queryFromHref)) {
    if (consumedKeys.has(key) || rawValue === undefined) {
      continue;
    }

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
  }

  const hash =
    "hash" in href && typeof href.hash === "string" && href.hash.length > 0
      ? href.hash.startsWith("#")
        ? href.hash
        : `#${href.hash}`
      : "";

  const queryString = searchParams.toString();

  return `${resolvedPathname}${queryString ? `?${queryString}` : ""}${hash}`;
}

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
            {navigation.map((item) => {
              const resolvedHref = resolveNavigationHref(item.href);

              return (
                <Link
                  key={
                    typeof resolvedHref === "string"
                      ? resolvedHref
                      : "pathname" in resolvedHref && resolvedHref.pathname
                        ? resolvedHref.pathname
                        : JSON.stringify(resolvedHref)
                  }
                  href={resolvedHref}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              );
            })}
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
