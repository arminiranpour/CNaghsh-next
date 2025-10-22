import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth/session";

export default async function AdminBillingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerAuthSession();

  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  return (
    <div dir="rtl" className="min-h-screen bg-muted/20">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
        {children}
      </div>
    </div>
  );
}
