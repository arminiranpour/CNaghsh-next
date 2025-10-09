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
  profilesList: "profiles:list",
  profileDetail: (profileId: string) => `profile:${profileId}`,
  profilesListCity: (cityId: string) => `profiles:list:city:${cityId}`,
  profilesListSkill: (skill: string) => `profiles:list:skill:${skill}`,
} as const;

export const CACHE_REVALIDATE = {
  cities: 60 * 60 * 24,
  jobFilters: 60 * 5,
  jobsList: 60,
  jobDetail: 60 * 2,
  profilesList: 60,
  profileDetail: 60 * 5,
} as const;

export function shouldBypassCache(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.ORCH_BYPASS_CACHE === "1";
}
