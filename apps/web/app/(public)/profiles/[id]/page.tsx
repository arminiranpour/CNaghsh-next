import { ProfilePageLayout } from "@/components/profile/ProfilePageLayout";
import { ProfilePageClient } from "@/components/profile/ProfilePageClient";

type PageProps = { params: { id: string } };

export default function PublicProfilePage(_props: PageProps) {
  return (
    <ProfilePageLayout>
      <ProfilePageClient />
    </ProfilePageLayout>
  );
}
