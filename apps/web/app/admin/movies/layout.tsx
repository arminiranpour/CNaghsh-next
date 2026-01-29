import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth/session";

export default async function MoviesAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerAuthSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <nav className="flex flex-wrap items-center gap-3 text-sm">
        <Link className="text-primary underline-offset-4 hover:underline" href="/admin/movies">
          فیلم‌ها
        </Link>
        <Link className="text-primary underline-offset-4 hover:underline" href="/admin/movies/new">
          افزودن فیلم
        </Link>
        <Link className="text-primary underline-offset-4 hover:underline" href="/admin/genres">
          ژانرها
        </Link>
      </nav>
      {children}
    </div>
  );
}
