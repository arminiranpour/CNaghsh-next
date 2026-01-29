import type { ReactNode } from "react";

export default function CoursesBackgroundLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* BG pinned to the top of the viewport */}
      <div
        className="absolute inset-0 -z-10 bg-[url('/images/concrete-wall.png')] bg-cover bg-center bg-no-repeat"
        aria-hidden="true"
      />
      {/* optional dark gradient like other pages */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent " aria-hidden="true" />

      {/* Content layer */}
      <div className="relative min-h-screen w-full">{children}</div>
    </div>
  );
}
