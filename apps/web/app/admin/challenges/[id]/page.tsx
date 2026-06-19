import { redirect } from "next/navigation";

export default async function ChallengeAdminRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/admin/challenges/${params.id}/edit`);
}
