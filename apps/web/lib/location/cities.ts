import { unstable_cache } from "next/cache";

import { CACHE_REVALIDATE, CACHE_TAGS } from "@/lib/cache/config";

export type City = { id: string; name: string };

async function loadCities(): Promise<City[]> {
  // TODO: replace with real list when provided
  return [
    { id: "tehran", name: "تهران" },
    { id: "isfahan", name: "اصفهان" },
    { id: "mashhad", name: "مشهد" },
  ];
}

const resolveCities = unstable_cache(loadCities, ["cities"], {
  revalidate: CACHE_REVALIDATE.cities,
  tags: [CACHE_TAGS.cities],
});

export async function getCities(): Promise<City[]> {
  return resolveCities();
}
