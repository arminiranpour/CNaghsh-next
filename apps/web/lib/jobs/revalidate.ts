"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache/config";
import { prisma } from "@/lib/prisma";

import { PUBLIC_JOB_SORTS } from "./constants";

export async function getJobTags(jobId: string): Promise<string[]> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      cityId: true,
      category: true,
      remote: true,
      payType: true,
    },
  });

  const tags = new Set<string>([
    CACHE_TAGS.jobDetail(jobId),
    CACHE_TAGS.jobsList,
    CACHE_TAGS.jobsListRemote(true),
    CACHE_TAGS.jobsListRemote(false),
  ]);

  for (const sort of PUBLIC_JOB_SORTS) {
    tags.add(CACHE_TAGS.jobsListSort(sort));
  }

  if (job?.cityId) {
    tags.add(CACHE_TAGS.jobsListCity(job.cityId));
  }

  if (job?.category) {
    tags.add(CACHE_TAGS.jobsListCategory(job.category));
  }

  if (job?.payType) {
    tags.add(CACHE_TAGS.jobsListPayType(job.payType));
  }

  return Array.from(tags);
}

export async function revalidateJobRelatedPaths(jobId: string): Promise<void> {
  const tags = await getJobTags(jobId);
  const uniqueTags = new Set([...tags, CACHE_TAGS.jobsFilters]);

  await Promise.all(Array.from(uniqueTags).map((tag) => revalidateTag(tag)));

  // Keep dashboard pages fresh for authors/admins.
  revalidatePath("/dashboard/jobs");
}
