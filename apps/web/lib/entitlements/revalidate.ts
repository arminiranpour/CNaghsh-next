"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/config";

const JOB_CREDIT_PATHS = ["/dashboard/jobs", "/dashboard/billing"];
const SUBSCRIPTION_PATHS = ["/dashboard/billing", "/dashboard"];

export const jobCreditTag = (userId: string) => CACHE_TAGS.jobCredits(userId);
export const subscriptionTag = (userId: string) =>
  CACHE_TAGS.subscription(userId);

export async function revalidateJobCreditViews(userId: string): Promise<void> {
  JOB_CREDIT_PATHS.forEach((path) => {
    revalidatePath(path);
  });

  revalidateTag(jobCreditTag(userId));
}

export async function revalidateSubscriptionViews(
  userId: string,
): Promise<void> {
  SUBSCRIPTION_PATHS.forEach((path) => {
    revalidatePath(path);
  });

  revalidateTag(subscriptionTag(userId));
}
