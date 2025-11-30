import type { NormalizedSearchParams } from "@/lib/url/normalizeSearchParams";
import { setSkillsSearchParam } from "@/lib/url/skillsParam";

export function buildProfilesHref(
  normalized: NormalizedSearchParams,
  overridesFactory: () => Partial<NormalizedSearchParams>,
) {
  const overrides = overridesFactory();
  const next: NormalizedSearchParams = { ...normalized, ...overrides };

  const params = new URLSearchParams();

  if (next.query) params.set("query", next.query);
  if (next.city) params.set("city", next.city);
  if (Array.isArray(next.gender) && next.gender.length) {
    params.set("gender", next.gender.join(","));
  }
  if (typeof next.ageMin === "number") params.set("ageMin", next.ageMin.toString());
  if (typeof next.ageMax === "number") params.set("ageMax", next.ageMax.toString());
  if (Array.isArray(next.edu) && next.edu.length) {
    params.set("edu", next.edu.join(","));
  }
  if (Array.isArray(next.lang) && next.lang.length) {
    params.set("lang", next.lang.join(","));
  }
  if (Array.isArray(next.accent) && next.accent.length) {
    params.set("accent", next.accent.join(","));
  }
  if (next.sort) params.set("sort", next.sort);
  if (next.remote) params.set("remote", next.remote);
  if (next.category) params.set("category", next.category);
  if (next.payType) params.set("payType", next.payType);
  if (next.featured) params.set("featured", next.featured);
  if (Array.isArray(next.skills) && next.skills.length) {
    setSkillsSearchParam(params, next.skills);
  }

  const pageValue = overrides.page ?? next.page;
  if (pageValue && pageValue > 1) {
    params.set("page", pageValue.toString());
  }

  const search = params.toString();
  return search ? `/profiles?${search}` : "/profiles";
}
