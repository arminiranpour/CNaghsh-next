import type { ReactNode } from "react";

const PROFILES_BACKGROUND = [
  "radial-gradient(900px 900px at 0% 0%, rgba(252, 154, 72, 0.35), transparent 95%)",
  "radial-gradient(900px 900px at 100% 0%, rgba(112, 203, 212, 0.4), transparent 100%)",
  "radial-gradient(900px 900px at 100% 100%, rgba(252, 154, 72, 0.3), transparent 80%)",
  "radial-gradient(900px 900px at 0% 100%, rgba(112, 203, 212, 0.35), transparent 80%)",
  "radial-gradient(1000px 800px at 50% 50%, rgba(243, 238, 230, 0.85), transparent 50%)",
  "url('/profiles/concretewall-bg.png')",
].join(", ");

export default function ProfilesBackgroundLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: "#f4f1ed",
        backgroundImage: PROFILES_BACKGROUND,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {children}
    </div>
  );
}
