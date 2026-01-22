"use client";

import { useState } from "react";

import type { ProfileTabId, PublicProfileData } from "@/components/profile/ProfilePageClient";
import { CenterPane } from "@/components/profile/CenterPane/CenterPane";
import { LeftRail } from "@/components/profile/LeftRail/LeftRail";
import { RightPane } from "@/components/profile/RightPane/RightPane";
import { EditProfileLeftRail } from "@/components/profile/editProfile/EditProfileLeftRail";
import { PortfolioEditCenterPane } from "@/components/profile/editProfile/PortfolioEditCenterPane";
import { EditProfileRightRail } from "@/components/profile/editProfile/EditProfileRightRail";
import type { City } from "@/lib/location/cities";
import type { PortfolioEditInitialValues } from "@/lib/profile/portfolio-edit";

type ProvinceOption = {
  id: string;
  name: string;
};

type DashboardProfileClientProps = {
  profile: PublicProfileData;
  isOwner: boolean;
  initialValues: PortfolioEditInitialValues;
  cities: City[];
  provinces: ProvinceOption[];
};

export function DashboardProfileClient({
  profile,
  isOwner,
  initialValues,
  cities,
  provinces,
}: DashboardProfileClientProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabId>("personal");
  const [isEditingPortfolio, setIsEditingPortfolio] = useState(false);
  const canEdit = Boolean(isOwner);

  if (isEditingPortfolio) {
    return (
      <>
        <EditProfileLeftRail />
        <PortfolioEditCenterPane
          initialValues={initialValues}
          cities={cities}
          provinces={provinces}
          onCancel={() => setIsEditingPortfolio(false)}
          onSaved={() => setIsEditingPortfolio(false)}
        />
        <EditProfileRightRail
          avatarUrl={profile.avatarUrl ?? undefined}
          displayName={profile.displayName}
        />
      </>
    );
  }

  return (
    <>
      <LeftRail activeTab={activeTab} onTabChange={setActiveTab} />
      <CenterPane
        activeTab={activeTab}
        profile={profile}
        canEdit={canEdit}
        onEditClick={() => setIsEditingPortfolio(true)}
      />
      <RightPane profile={profile} isOwner={isOwner} />
    </>
  );
}
