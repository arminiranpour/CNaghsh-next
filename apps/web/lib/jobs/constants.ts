export const PUBLIC_JOBS_PAGE_SIZE = 12;

export const PUBLIC_JOB_SORTS = ["newest", "featured", "expiring"] as const;

export type PublicJobSort = (typeof PUBLIC_JOB_SORTS)[number];
