"use client";

import { useState } from "react";
import { LeftRail } from "@/components/profile/LeftRail/LeftRail";
import { CenterPane } from "@/components/profile/CenterPane/CenterPane";
import { RightPane } from "@/components/profile/RightPane/RightPane";

export type ProfileTabId = "personal" | "gallery" | "videos" | "audio" | "awards";

export function ProfilePageClient() {
  const [activeTab, setActiveTab] = useState<ProfileTabId>("personal");

  return (
    <>
      <LeftRail activeTab={activeTab} onTabChange={setActiveTab} />
      <CenterPane activeTab={activeTab} />
      <RightPane />
    </>
  );
}
