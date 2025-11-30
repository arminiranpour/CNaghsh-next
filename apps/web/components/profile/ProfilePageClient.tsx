"use client";

import { useState } from "react";
import type { Prisma } from "@prisma/client";
import { LeftRail } from "@/components/profile/LeftRail/LeftRail";
import { CenterPane } from "@/components/profile/CenterPane/CenterPane";
import { RightPane } from "@/components/profile/RightPane/RightPane";
import type { LanguageSkill } from "@/lib/profile/languages";
import type { MediaPlaybackKind } from "@/lib/media/urls";

export type ProfileTabId = "personal" | "gallery" | "videos" | "audio" | "awards";

export type ProfileVideoData = {
  mediaId: string;
  url: string;
  posterUrl?: string | null;
  title?: string;
  playbackKind?: MediaPlaybackKind;
};

export type PublicProfileData = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  age?: number | null;
  bio?: string | null;
  cityName?: string | null;
  skills: string[];
  languages: LanguageSkill[];
  accents?: string[];
  gallery: { url: string }[];
  degrees?: { degreeLevel: string; major: string }[];
  experience?: Prisma.JsonValue | null;
  voices?: { mediaId: string; url: string; title?: string | null; duration?: number | null }[];
  videos?: ProfileVideoData[];
  awards?: { id?: string; title: string; place?: string | null; awardDate?: string | null }[];
};

export type InviteJobOption = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
};

type ProfilePageClientProps = {
  profile: PublicProfileData;
  isOwner: boolean;
  canInvite: boolean;
  inviteJobs: InviteJobOption[];
  inviteNotice?: string | null;
};

export function ProfilePageClient({
  profile,
  isOwner,
  canInvite,
  inviteJobs,
  inviteNotice,
}: ProfilePageClientProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabId>("personal");

  return (
    <>
      <LeftRail activeTab={activeTab} onTabChange={setActiveTab} />
      <CenterPane activeTab={activeTab} profile={profile} />
      <RightPane
        profile={profile}
        isOwner={isOwner}
        canInvite={canInvite}
        inviteJobs={inviteJobs}
        inviteNotice={inviteNotice}
      />
    </>
  );
}
