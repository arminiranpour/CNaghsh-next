"use server";

import { revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/config";

export async function revalidateCities(): Promise<void> {
  revalidateTag(CACHE_TAGS.cities);
}
