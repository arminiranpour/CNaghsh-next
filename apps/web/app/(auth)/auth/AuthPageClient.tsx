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
      <div className="relative flex items-center justify-center min-h-screen">

        <div
  className="
    absolute
    top-1/2 left-1/2
    -translate-x-1/2 -translate-y-1/2
    w-full h-full
    max-w-[1600px] max-h-[800px]
    border-[3px] border-white rounded-[34px]
    pointer-events-none
  "    >
    <div
      className="flex items-center justify-center w-full h-full gap-12 md:flex-row"
      dir="ltr"
    >
      {/* RIGHT SIDE: Auth Panel (back to RTL) */}
     <div className="w-full h-full max-h-[647px] max-w-[564px]">
        <LoginForm
          initialTab={initialTab}
          callbackUrl={callbackUrl}
          onPasswordPhaseChange={setIsPasswordPhase}
        />
        </div>
              {/* LEFT SIDE: Character */}
      <div className="flex w-full h-full justify-center md:w-auto -translate-x-4">
        <LoginCharacter isPasswordPhase={isPasswordPhase} />
      </div>
      </div>
    </div>
    </div>
  );
}
