"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/config";

const JOB_CREDIT_PATHS = ["/dashboard/jobs", "/dashboard/billing"];
const SUBSCRIPTION_PATHS = ["/dashboard/billing", "/dashboard"];

const isStaticGenerationStoreMissingError = (error: unknown) =>
  error instanceof Error &&
  error.message.toLowerCase().includes("static generation store missing");

const safeRevalidate = async (action: () => void | Promise<void>) => {
  try {
    await action();
  } catch (error) {
    if (!isStaticGenerationStoreMissingError(error)) {
      throw error;
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[entitlements.revalidate] skipping revalidation outside request context",
        error,
      );
    }
  }
};

export const jobCreditTag = (userId: string) => CACHE_TAGS.jobCredits(userId);
export const subscriptionTag = (userId: string) =>
  CACHE_TAGS.subscription(userId);

export async function revalidateJobCreditViews(userId: string): Promise<void> {
  await Promise.all(
    JOB_CREDIT_PATHS.map((path) => safeRevalidate(() => revalidatePath(path))),
  );

  await safeRevalidate(() => revalidateTag(jobCreditTag(userId)));
}

export async function revalidateSubscriptionViews(
  userId: string,
): Promise<void> {
  await Promise.all(
    SUBSCRIPTION_PATHS.map((path) => safeRevalidate(() => revalidatePath(path))),
  );

  await safeRevalidate(() => revalidateTag(subscriptionTag(userId)));
}
