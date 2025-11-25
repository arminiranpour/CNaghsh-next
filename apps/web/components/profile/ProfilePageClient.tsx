"use client";

import { useState } from "react";
import { LeftRail } from "@/components/profile/LeftRail/LeftRail";
import { CenterPane } from "@/components/profile/CenterPane/CenterPane";
import { RightPane } from "@/components/profile/RightPane/RightPane";

export type ProfileTabId = "personal" | "gallery" | "videos" | "audio" | "awards";

export type PublicProfileData = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  age?: number | null;
  bio?: string | null;
  cityName?: string | null;
  skills: string[];
  gallery: { url: string }[];
};

type ProfilePageClientProps = {
  profile: PublicProfileData;
  isOwner: boolean;
};

export function ProfilePageClient({ profile, isOwner }: ProfilePageClientProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabId>("personal");

  return (
    <>
      <LeftRail activeTab={activeTab} onTabChange={setActiveTab} />
      <CenterPane activeTab={activeTab} profile={profile} />
      <RightPane profile={profile} isOwner={isOwner} />
    </>
  );
}
