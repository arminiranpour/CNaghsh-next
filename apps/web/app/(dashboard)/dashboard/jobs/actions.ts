"use server";

import type { z } from "zod";
import { ZodError } from "zod";

import { getServerAuthSession } from "@/lib/auth/session";
import { closeJob } from "@/lib/jobs/closeJob";
import {
  JobAccessDeniedError,
  JobNotFoundError,
  JobStatusError,
} from "@/lib/jobs/errors";
import { publishJob } from "@/lib/jobs/publishJob";
import { createJob } from "@/lib/jobs/createJob";
import { republishJob } from "@/lib/jobs/republishJob";
import { updateJob } from "@/lib/jobs/updateJob";
import { jobCreateSchema, jobUpdateSchema } from "@/lib/zod/jobSchemas";
import {
  ExpiredJobCreditsError,
  InsufficientJobCreditsError,
  NoEntitlementError,
} from "@/lib/errors";

const AUTH_ERROR = "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.";
const GENERIC_ERROR = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";

const CREDIT_ERROR_MESSAGES = {
  INSUFFICIENT_JOB_CREDITS: "اعتبار کافی ندارید.",
  EXPIRED_JOB_CREDITS: "اعتبار شما منقضی شده است.",
  NO_JOB_POST_ENTITLEMENT: "هیچ بسته اعتباری برای شما ثبت نشده است.",
} as const;

const PRICING_CTA = {
  label: "مشاهده پلن‌ها",
  href: "/pricing" as const,
};

const DIGIT_MAP: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

type JobFormValues = z.infer<typeof jobCreateSchema>;

export type JobFormInput = {
  title: string;
  description: string;
  category: string;
  cityId?: string | null;
  payType?: string | null;
  payAmount?: string | number | null;
  currency?: string | null;
  remote: boolean;
};

type FieldErrors = Partial<Record<keyof JobFormValues, string>>;

export type FormActionResult = {
  ok: boolean;
  jobId?: string;
  error?: string;
  fieldErrors?: FieldErrors;
};

export type SimpleActionResult = {
  ok: boolean;
  error?: string;
  errorCode?: keyof typeof CREDIT_ERROR_MESSAGES;
  cta?: typeof PRICING_CTA;
};

type SanitizedJobInput = {
  title: string;
  description: string;
  category: string;
  cityId?: string;
  payType?: string;
  payAmount?: string | number;
  currency?: string;
  remote: boolean;
};

function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (char) => DIGIT_MAP[char] ?? char);
}

function trimToUndefined(value?: string | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeJobInput(input: JobFormInput): SanitizedJobInput {
  const title = (input.title ?? "").trim();
  const description = (input.description ?? "").trim();
  const category = (input.category ?? "").trim();
  const cityId = trimToUndefined(input.cityId ?? undefined);
  const payType = trimToUndefined(input.payType ?? undefined);
  const currency = trimToUndefined(input.currency ?? undefined)?.toUpperCase();

  let payAmount: string | number | undefined;

  if (typeof input.payAmount === "number") {
    payAmount = Number.isFinite(input.payAmount)
      ? input.payAmount
      : undefined;
  } else if (typeof input.payAmount === "string") {
    const normalized = normalizeDigits(input.payAmount.trim());
    payAmount = normalized.length > 0 ? normalized : undefined;
  } else {
    payAmount = undefined;
  }

  return {
    title,
    description,
    category,
    cityId,
    payType,
    payAmount,
    currency,
    remote: Boolean(input.remote),
  };
}

function mapZodErrors(
  error: ZodError<JobFormValues>,
): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in fieldErrors)) {
      fieldErrors[field as keyof JobFormValues] = issue.message;
    }
  }

  return fieldErrors;
}

async function ensureSessionUserId(): Promise<string> {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    throw new Error(AUTH_ERROR);
  }

  return session.user.id;
}

function handleAuthError(error: unknown) {
  if (error instanceof Error && error.message === AUTH_ERROR) {
    return { ok: false as const, error: AUTH_ERROR };
  }

  return null;
}

function handleJobAccessErrors(error: unknown) {
  if (error instanceof JobNotFoundError) {
    return { ok: false as const, error: "آگهی مورد نظر یافت نشد." };
  }

  if (error instanceof JobAccessDeniedError) {
    return { ok: false as const, error: "دسترسی به این آگهی برای شما مجاز نیست." };
  }

  if (error instanceof JobStatusError) {
    return { ok: false as const, error: error.message };
  }

  return null;
}

function handleCreditErrors(error: unknown): SimpleActionResult | null {
  if (error instanceof InsufficientJobCreditsError) {
    return {
      ok: false,
      error: CREDIT_ERROR_MESSAGES[error.code],
      errorCode: error.code,
      cta: PRICING_CTA,
    };
  }

  if (error instanceof ExpiredJobCreditsError) {
    return {
      ok: false,
      error: CREDIT_ERROR_MESSAGES[error.code],
      errorCode: error.code,
      cta: PRICING_CTA,
    };
  }

  if (error instanceof NoEntitlementError) {
    return {
      ok: false,
      error: CREDIT_ERROR_MESSAGES[error.code],
      errorCode: error.code,
      cta: PRICING_CTA,
    };
  }

  return null;
}

export async function createJobAction(input: JobFormInput): Promise<FormActionResult> {
  try {
    const userId = await ensureSessionUserId();
    const sanitized = sanitizeJobInput(input);
    const parsed = jobCreateSchema.safeParse(sanitized);

    if (!parsed.success) {
      return { ok: false, fieldErrors: mapZodErrors(parsed.error) };
    }

    const job = await createJob(userId, parsed.data);

    return { ok: true, jobId: job.id };
  } catch (error) {
    const authResult = handleAuthError(error);

    if (authResult) {
      return authResult;
    }

    console.error("createJobAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateJobAction(
  jobId: string,
  input: JobFormInput,
): Promise<FormActionResult> {
  try {
    const userId = await ensureSessionUserId();
    const sanitized = sanitizeJobInput(input);
    const parsed = jobUpdateSchema.safeParse(sanitized);

    if (!parsed.success) {
      return { ok: false, fieldErrors: mapZodErrors(parsed.error) };
    }

    await updateJob(userId, jobId, parsed.data);

    return { ok: true, jobId };
  } catch (error) {
    const authResult = handleAuthError(error);

    if (authResult) {
      return authResult;
    }

    const jobError = handleJobAccessErrors(error);

    if (jobError) {
      return jobError;
    }

    if (error instanceof ZodError) {
      return {
        ok: false,
        fieldErrors: mapZodErrors(error as ZodError<JobFormValues>),
      };
    }

    console.error("updateJobAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function publishJobAction(jobId: string): Promise<SimpleActionResult> {
  try {
    const userId = await ensureSessionUserId();
    await publishJob(userId, jobId);
    return { ok: true };
  } catch (error) {
    const authResult = handleAuthError(error);
    if (authResult) {
      return authResult;
    }

    const jobError = handleJobAccessErrors(error);
    if (jobError) {
      return jobError;
    }

    const creditError = handleCreditErrors(error);
    if (creditError) {
      return creditError;
    }

    console.error("publishJobAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function closeJobAction(jobId: string): Promise<SimpleActionResult> {
  try {
    const userId = await ensureSessionUserId();
    await closeJob(userId, jobId);
    return { ok: true };
  } catch (error) {
    const authResult = handleAuthError(error);
    if (authResult) {
      return authResult;
    }

    const jobError = handleJobAccessErrors(error);
    if (jobError) {
      return jobError;
    }

    console.error("closeJobAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function republishJobAction(
  jobId: string,
): Promise<SimpleActionResult> {
  try {
    const userId = await ensureSessionUserId();
    await republishJob(userId, jobId);
    return { ok: true };
  } catch (error) {
    const authResult = handleAuthError(error);
    if (authResult) {
      return authResult;
    }

    const jobError = handleJobAccessErrors(error);
    if (jobError) {
      return jobError;
    }

    const creditError = handleCreditErrors(error);
    if (creditError) {
      return creditError;
    }

    console.error("republishJobAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}
