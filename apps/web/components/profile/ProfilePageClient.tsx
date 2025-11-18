"use client";

import { useState } from "react";
import { LeftRail } from "@/components/profile/LeftRail/LeftRail";

export type ProfileTabId = "personal" | "gallery" | "videos" | "audio" | "awards";

export function ProfilePageClient() {
  const [activeTab, setActiveTab] = useState<ProfileTabId>("personal");

  return (
    <>
      <LeftRail activeTab={activeTab} onTabChange={setActiveTab} />
      {/* بعداً همین activeTab را به CenterPane و RightCard هم پاس می‌دهیم */}
    </>
  );
}
