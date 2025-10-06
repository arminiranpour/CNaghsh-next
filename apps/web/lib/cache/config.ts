export const CACHE_TAGS = {
  cities: "cities",
  jobsFilters: "jobs:filters",
  jobsList: "jobs:list",
  jobDetail: (jobId: string) => `job:${jobId}`,
  jobsListCity: (cityId: string) => `jobs:list:city:${cityId}`,
  jobsListCategory: (category: string) => `jobs:list:category:${category}`,
  jobsListRemote: (remote: boolean) => `jobs:list:remote:${remote ? 1 : 0}`,
  jobsListPayType: (payType: string) => `jobs:list:payType:${payType}`,
  jobsListSort: (sort: string) => `jobs:list:sort:${sort}`,
  jobViews: (jobId: string) => `job:${jobId}:views`,
} as const;

export const CACHE_REVALIDATE = {
  cities: 60 * 60 * 24,
  jobFilters: 60 * 5,
  jobsList: 60,
  jobDetail: 60 * 2,
} as const;
