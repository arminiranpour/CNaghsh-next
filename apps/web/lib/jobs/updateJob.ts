import { JobStatus } from "@prisma/client";
import type { z } from "zod";

import { prisma } from "@/lib/prisma";
import { jobUpdateSchema } from "@/lib/zod/jobSchemas";

import {
  JobAccessDeniedError,
  JobNotFoundError,
  JobStatusError,
} from "./errors";
import { normalizeOptional } from "./createJob";
import { revalidateJobRelatedPaths } from "./revalidate";

type UpdateJobInput = z.infer<typeof jobUpdateSchema>;

export async function updateJob(
  userId: string,
  jobId: string,
  data: UpdateJobInput,
) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { userId: true, status: true },
  });

  if (!job) {
    throw new JobNotFoundError();
  }

  if (job.userId !== userId) {
    throw new JobAccessDeniedError();
  }

  if (
    job.status !== JobStatus.DRAFT &&
    job.status !== JobStatus.PUBLISHED &&
    job.status !== JobStatus.CLOSED
  ) {
    throw new JobStatusError("امکان ویرایش این آگهی وجود ندارد.");
  }

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: {
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
    },
  });

  await revalidateJobRelatedPaths(updated.id);

  return updated;
}
