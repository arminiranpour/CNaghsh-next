import type { ReactNode } from "react";

const HOME_BACKGROUND =
  "radial-gradient(1200px 600px at 10% 0%, rgba(245, 138, 31, 0.08), transparent 60%), " +
  "radial-gradient(1200px 700px at 90% 10%, rgba(112, 203, 212, 0.1), transparent 65%)";

export default function HomeBackgroundLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundImage: HOME_BACKGROUND,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {children}
    </div>
  );
}
