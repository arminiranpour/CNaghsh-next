import { JobModeration, JobStatus } from "@prisma/client";
import type { z } from "zod";

import { prisma } from "@/lib/prisma";
import { jobCreateSchema } from "@/lib/zod/jobSchemas";
import { revalidateJobRelatedPaths } from "./revalidate";

type CreateJobInput = z.infer<typeof jobCreateSchema>;

export function normalizeOptional<T extends string | number | null | undefined>(
  value: T,
): T | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? (trimmed as T) : (null as T);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : (null as T);
  }

  return value ?? null;
}

export async function createJob(userId: string, data: CreateJobInput) {
  const job = await prisma.job.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      category: data.category,
      cityId: normalizeOptional(data.cityId),
      payType: normalizeOptional(data.payType),
      payAmount: data.payAmount ?? null,
      currency: normalizeOptional(
        data.currency ? data.currency.toUpperCase() : data.currency,
      ),
      remote: data.remote,
      status: JobStatus.DRAFT,
      moderation: JobModeration.PENDING,
    },
  });

  await revalidateJobRelatedPaths(job.id);

  return job;
}
