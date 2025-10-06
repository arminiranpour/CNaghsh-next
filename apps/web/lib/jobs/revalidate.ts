"use server";

import { revalidatePath } from "next/cache";

export async function revalidateDashboardJobs(): Promise<void> {
  revalidatePath("/dashboard/jobs");
}

export async function revalidatePublicJobs(): Promise<void> {
  revalidatePath("/jobs");
}

export async function revalidateJobDetail(jobId: string): Promise<void> {
  revalidatePath(`/jobs/${jobId}`);
}

export async function revalidateJobRelatedPaths(jobId: string): Promise<void> {
  await revalidateDashboardJobs();
  await revalidatePublicJobs();
  await revalidateJobDetail(jobId);
}
