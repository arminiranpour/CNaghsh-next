import { getServerAuthSession } from "@/lib/auth/session";
import { badRequest, ok, unauthorized, safeJson } from "@/lib/http";
import {
  SubscriptionNotFoundError,
  setCancelAtPeriodEnd,
} from "@/lib/billing/subscriptionService";

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return unauthorized("UNAUTHORIZED");
  }

  const body = await safeJson<{ flag: unknown }>(request);

  if (!body.ok) {
    return badRequest("INVALID_JSON");
  }

  const { flag } = body.data;

  if (typeof flag !== "boolean") {
    return badRequest("INVALID_FLAG");
  }

  try {
    const subscription = await setCancelAtPeriodEnd({
      userId: session.user.id,
      flag,
    });

    return ok({ subscription });
  } catch (error) {
    if (error instanceof SubscriptionNotFoundError) {
      return badRequest("SUBSCRIPTION_NOT_FOUND");
    }
    throw error;
  }
}
