import { getPublishability } from "@/lib/profile/enforcement";

export async function canPublishProfile(userId: string): Promise<boolean> {
  const result = await getPublishability(userId);
  return result.canPublish;
}
