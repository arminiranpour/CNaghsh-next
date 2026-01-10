import type { ReactNode } from "react";

export default function CoursesBackgroundLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-[url('/images/concrete-wall.png')] bg-cover bg-center bg-no-repeat">
      {children}
    </div>
  );
}
