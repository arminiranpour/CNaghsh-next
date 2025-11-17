"use client";

import { useState } from "react";

import { LoginCharacter } from "@/components/auth/LoginCharacter";
import { LoginForm } from "@/components/auth/LoginForm";
import type { AuthTab } from "@/lib/url/auth-tabs";

type AuthPageClientProps = {
  initialTab: AuthTab;
  callbackUrl?: string;
};

export function AuthPageClient({ initialTab, callbackUrl }: AuthPageClientProps) {
  const [isPasswordPhase, setIsPasswordPhase] = useState(false);

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        backgroundImage: "url(/images/auth-bg.jpg)",
        backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "100% auto",  // ← FIX: fill width, no cropping
      }}
    >
      {/* LAYOUT IS LTR so the character stays on the left */}
      <div 
        className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-12 md:flex-row md:gap-12"
        dir="ltr"
      >
        {/* LEFT SIDE: Character */}
        <div className="flex w-full justify-center md:w-auto">
          <LoginCharacter isPasswordPhase={isPasswordPhase} />
        </div>

        {/* RIGHT SIDE: Auth Panel (back to RTL) */}
        <div className="w-full max-w-xl" dir="rtl">
          <LoginForm
            callbackUrl={callbackUrl}
            onPasswordPhaseChange={setIsPasswordPhase}
          />
        </div>
      </div>
    </div>
  );
}
