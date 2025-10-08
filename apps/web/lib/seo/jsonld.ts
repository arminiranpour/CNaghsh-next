import { SITE_NAME } from "@/lib/seo/constants";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function siteOrganizationJsonLd({
  name,
  url,
  logoUrl,
}: {
  name: string;
  url: string;
  logoUrl: string;
}): Record<string, JsonValue> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    logo: {
      "@type": "ImageObject",
      url: logoUrl,
    },
  };
}

export function websiteJsonLd({
  url,
  searchUrlProfiles,
  searchUrlJobs,
}: {
  url: string;
  searchUrlProfiles: string;
  searchUrlJobs: string;
}): Record<string, JsonValue> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url,
    potentialAction: [
      {
        "@type": "SearchAction",
        target: `${searchUrlProfiles}?query={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
      {
        "@type": "SearchAction",
        target: `${searchUrlJobs}?query={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    ],
  };
}

export function breadcrumbsJsonLd(
  segments: { name: string; item: string }[],
): Record<string, JsonValue> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: segments.map((segment, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: segment.name,
      item: segment.item,
    })),
  };
}

export type ProfilePersonJsonLdInput = {
  name: string;
  url: string;
  stageName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  cityName?: string | null;
  socialLinks?: string[];
};

export function profilePersonJsonLd(
  profile: ProfilePersonJsonLdInput,
): Record<string, JsonValue> {
  const sameAs = profile.socialLinks?.filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    url: profile.url,
    ...(profile.stageName && profile.stageName !== profile.name
      ? { alternateName: profile.stageName }
      : {}),
    ...(profile.bio ? { description: profile.bio } : {}),
    ...(profile.avatarUrl ? { image: profile.avatarUrl } : {}),
    ...(profile.cityName
      ? {
          homeLocation: {
            "@type": "Place",
            name: profile.cityName,
            address: {
              "@type": "PostalAddress",
              addressLocality: profile.cityName,
              addressCountry: "IR",
            },
          },
        }
      : {}),
    ...(sameAs && sameAs.length ? { sameAs } : {}),
  };
}

type MonetaryValue = {
  currency: string;
  value: number;
  unitText?: string;
};

export type JobPostingJsonLdInput = {
  id: string;
  title: string;
  description: string;
  url: string;
  organizationName: string;
  remote?: boolean;
  cityName?: string | null;
  applicantRegionName?: string | null;
  datePosted?: Date | string | null;
  validThrough?: Date | string | null;
  employmentType?: string | null;
  baseSalary?: MonetaryValue | null;
};

function sanitizeDescription(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function normalizeDate(value?: Date | string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export function jobPostingJsonLd(
  job: JobPostingJsonLdInput,
): Record<string, JsonValue> {
  const description = sanitizeDescription(job.description);
  const baseSalary = job.baseSalary;

  const payload: Record<string, JsonValue> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description,
    hiringOrganization: {
      "@type": "Organization",
      name: job.organizationName,
    },
    url: job.url,
    identifier: {
      "@type": "PropertyValue",
      name: "internal",
      value: job.id,
    },
    ...(job.remote ? { jobLocationType: "TELECOMMUTE" } : {}),
    ...(job.employmentType ? { employmentType: job.employmentType } : {}),
    ...(normalizeDate(job.datePosted) ? { datePosted: normalizeDate(job.datePosted) } : {}),
    ...(normalizeDate(job.validThrough) ? { validThrough: normalizeDate(job.validThrough) } : {}),
  };

  if (!job.remote && job.cityName) {
    payload.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.cityName,
        addressCountry: "IR",
      },
    };
  }

  if (job.remote) {
    payload.applicantLocationRequirements = [
      {
        "@type": "Country",
        name: job.applicantRegionName ?? "Iran",
      },
    ];
  }

  if (baseSalary && typeof baseSalary.value === "number" && baseSalary.currency) {
    payload.baseSalary = {
      "@type": "MonetaryAmount",
      currency: baseSalary.currency,
      value: {
        "@type": "QuantitativeValue",
        value: baseSalary.value,
        ...(baseSalary.unitText ? { unitText: baseSalary.unitText } : {}),
      },
    };
  }

  return payload;
}

