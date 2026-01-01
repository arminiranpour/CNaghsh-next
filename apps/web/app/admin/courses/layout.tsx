import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth/session";

export default async function CoursesAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerAuthSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  return (
    <div className="space-y-6 p-6">
      <nav className="flex flex-wrap items-center gap-3 text-sm">
        <Link className="text-primary underline-offset-4 hover:underline" href="/admin/courses">
          Courses
        </Link>
        <Link className="text-primary underline-offset-4 hover:underline" href="/admin/courses/new">
          New Course
        </Link>
      </nav>
      {children}
    </div>
  );
}
