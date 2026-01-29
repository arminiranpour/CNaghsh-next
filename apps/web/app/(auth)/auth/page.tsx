import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AuthPageClient } from "./AuthPageClient";
import { getAuthConfig } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { parseAuthTabParam } from "@/lib/url/auth-tabs";

export const metadata: Metadata = {
  title: "ورود / ثبت‌نام",
  description:
    "از همین‌جا وارد حساب کاربری صحنه شوید یا ثبت‌نام کنید و به ابزارهای حرفه‌ای بازیگری دسترسی داشته باشید.",
};

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await getServerSession(getAuthConfig(prisma));

  if (session?.user) {
    redirect("/dashboard");
  }

  const tabParam = getFirstParam(searchParams?.tab);
  const callbackUrl = getFirstParam(searchParams?.callbackUrl);
  const initialTab = parseAuthTabParam(tabParam);

  return (
    <main
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/auth-bg.jpg')" }}
    >
      <div className="w-full h-full px-4 py-12 mt-[120px]">
        <AuthPageClient initialTab={initialTab} callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}

function getFirstParam(value?: string | string[] | null) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
}
