import { getServerAuthSession } from "@/lib/auth/session";
import { ok, unauthorized } from "@/lib/http";
import { getSubscription } from "@/lib/billing/subscriptionService";

export async function GET() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return unauthorized("UNAUTHORIZED");
  }

  const subscription = await getSubscription(session.user.id);

  return ok({ subscription });
}
