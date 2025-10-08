import { buildCanonical } from "../lib/seo/canonical";
import { getBaseUrl } from "../lib/seo/baseUrl";
import { jobPostingJsonLd, websiteJsonLd } from "../lib/seo/jsonld";
import { prisma } from "../lib/prisma";
import { getJobOrganizationName } from "../lib/jobs/seo";

async function main() {
  const canonical = buildCanonical("/jobs", { remote: true, page: 3 });
  console.log("Sample canonical:", canonical);

  const baseUrl = getBaseUrl();
  const webSiteJson = websiteJsonLd({
    url: baseUrl,
    searchUrlProfiles: `${baseUrl}/profiles`,
    searchUrlJobs: `${baseUrl}/jobs`,
  });
  console.log("WebSite JSON-LD:\n", JSON.stringify(webSiteJson, null, 2));

  const job = await prisma.job.findFirst({
    where: {
      status: "PUBLISHED",
      moderation: "APPROVED",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          profile: {
            select: {
              id: true,
              stageName: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!job) {
    console.log("No published jobs available for smoke test.");
    return;
  }

  const jobJson = jobPostingJsonLd({
    id: job.id,
    title: job.title,
    description: job.description,
    url: `${baseUrl}/jobs/${job.id}`,
    organizationName: getJobOrganizationName(job),
    remote: job.remote,
    cityName: job.cityId ?? undefined,
    applicantRegionName: job.cityId ?? "Iran",
    datePosted: job.createdAt,
    validThrough: job.featuredUntil ?? undefined,
    baseSalary:
      job.payAmount !== null && job.payAmount !== undefined && job.currency
        ? {
            currency: job.currency,
            value: job.payAmount,
          }
        : undefined,
  });

  console.log("JobPosting JSON-LD:\n", JSON.stringify(jobJson, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
