import type { Metadata } from "next";

import { buildAbsoluteUrl } from "@/lib/url";

import type { PublicJobWithOwner } from "./publicQueries";

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  contractor: "CONTRACTOR",
  freelance: "CONTRACTOR",
  temporary: "TEMPORARY",
  internship: "INTERN",
  intern: "INTERN",
  seasonal: "TEMPORARY",
  volunteer: "VOLUNTEER",
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function coerceDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function sanitizeDescription(value: string): string {
  return collapseWhitespace(stripHtml(value));
}

function mapEmploymentType(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const key = value.trim().toLowerCase();
  return EMPLOYMENT_TYPE_MAP[key];
}

export function getJobOrganizationName(job: PublicJobWithOwner): string {
  const profile = job.user?.profile ?? null;

  if (profile?.stageName?.trim()) {
    return profile.stageName.trim();
  }

  const fullName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();
  if (fullName) {
    return fullName;
  }

  if (job.user?.name?.trim()) {
    return job.user.name.trim();
  }

  return "کارفرما";
}

type JobPostingJsonLdOptions = {
  cityName?: string;
  url?: string;
  includeContext?: boolean;
};

export function buildJobPostingJsonLd(
  job: PublicJobWithOwner,
  options: JobPostingJsonLdOptions = {}
): Record<string, unknown> {
  const description = sanitizeDescription(job.description);
  const employmentType = mapEmploymentType(job.payType);
  const organizationName = getJobOrganizationName(job);

  const createdAt = coerceDate(job.createdAt);

  const base: Record<string, unknown> = {
    ...(options.includeContext === false ? {} : { "@context": "https://schema.org" }),
    "@type": "JobPosting",
    title: job.title,
    description,
    ...(createdAt ? { datePosted: createdAt.toISOString() } : {}),
    hiringOrganization: {
      "@type": "Organization",
      name: organizationName,
    },
    ...(options.url ? { url: options.url } : {}),
    identifier: {
      "@type": "PropertyValue",
      name: "internal",
      value: job.id,
    },
    ...(employmentType ? { employmentType } : {}),
    ...(job.remote ? { jobLocationType: "TELECOMMUTE" } : {}),
  };

  if (options.cityName) {
    base.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: options.cityName,
        addressCountry: "IR",
      },
    };
  }

  if (job.payAmount !== null && job.payAmount !== undefined && job.currency) {
    base.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.currency,
      value: {
        "@type": "QuantitativeValue",
        value: job.payAmount,
      },
    };
  }

  return base;
}

export function buildJobPostingGraphJsonLd(
  jobs: PublicJobWithOwner[],
  resolveCityName: (cityId: string | null) => string | undefined
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": jobs.map((job) =>
      buildJobPostingJsonLd(job, {
        includeContext: false,
        cityName: resolveCityName(job.cityId ?? null),
        url: buildAbsoluteUrl(`/jobs/${job.id}`),
      })
    ),
  };
}

export function getJobDescriptionSnippet(job: PublicJobWithOwner, length = 160): string {
  const sanitized = sanitizeDescription(job.description);
  if (sanitized.length <= length) {
    return sanitized;
  }
  return `${sanitized.slice(0, length - 1)}…`;
}

type ListingMetadataOptions = {
  cityName?: string;
  category?: string;
  remote?: boolean;
  payType?: string;
  page?: number;
};

export function buildJobListingMetadata(options: ListingMetadataOptions = {}): Metadata {
  const titleParts = ["فرصت‌های شغلی"];

  if (options.category) {
    titleParts.push(`دسته ${options.category}`);
  }

  if (options.cityName) {
    titleParts.push(`در ${options.cityName}`);
  }

  if (options.remote) {
    titleParts.push("دورکاری");
  }

  const title = titleParts.join(" | ");

  const descriptionParts = [
    "آخرین فرصت‌های شغلی تاییدشده برای هنرمندان و بازیگران.",
  ];

  const filterDescriptions: string[] = [];

  if (options.category) {
    filterDescriptions.push(`دسته‌بندی ${options.category}`);
  }

  if (options.cityName) {
    filterDescriptions.push(`شهر ${options.cityName}`);
  }

  if (options.payType) {
    filterDescriptions.push(`نوع پرداخت ${options.payType}`);
  }

  if (options.remote) {
    filterDescriptions.push("فرصت‌های دورکاری");
  }

  if (filterDescriptions.length) {
    descriptionParts.push(`فیلتر شده بر اساس ${filterDescriptions.join("، ")}.`);
  }

  if (options.page && options.page > 1) {
    descriptionParts.push(`صفحه ${options.page}`);
  }

  return {
    title,
    description: descriptionParts.join(" "),
  };
}

type DetailMetadataOptions = {
  cityName?: string;
};

export function buildJobDetailMetadata(
  job: PublicJobWithOwner,
  options: DetailMetadataOptions = {}
): Metadata {
  const organizationName = getJobOrganizationName(job);
  const snippet = getJobDescriptionSnippet(job, 160);

  const descriptionParts = [snippet];

  if (options.cityName) {
    descriptionParts.push(`محل کار: ${options.cityName}.`);
  }

  if (job.remote) {
    descriptionParts.push("امکان فعالیت به صورت دورکاری فراهم است.");
  }

  return {
    title: `${job.title} | ${organizationName}`,
    description: descriptionParts.join(" "),
  };
}
