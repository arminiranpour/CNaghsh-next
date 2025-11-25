import { unstable_cache } from "next/cache";

import { CACHE_REVALIDATE, CACHE_TAGS } from "@/lib/cache/config";

import allLocations from "../../public/cities/all.json";

export type LocationType = "province" | "county" | "district" | "city" | "rural";

type LocationItem = {
  id: number | string;
  name: string;
  slug?: string;
  tel_prefix?: string;
  type: LocationType;
  province_id?: number | string | null;
  county_id?: number | string | null;
  district_id?: number | string | null;
  parent_id?: number | string | null;
};

export type City = {
  id: string;
  name: string;
  slug: string;
  provinceId?: string | null;
  countyId?: string | null;
  districtId?: string | null;
  telPrefix?: string | null;
};

const locations = allLocations as LocationItem[];

const normalizeId = (value: string | number | null | undefined) =>
  value === null || value === undefined ? null : String(value);

const matchesId = (
  value: string | number | null | undefined,
  target: string | number,
) => normalizeId(value) === normalizeId(target);

const toCity = (location: LocationItem): City => ({
  id: String(location.id),
  name: location.name,
  slug: location.slug ?? String(location.id),
  provinceId: normalizeId(location.province_id ?? location.parent_id),
  countyId: normalizeId(location.county_id),
  districtId: normalizeId(location.district_id),
  telPrefix: location.tel_prefix ?? null,
});

const extractCities = (): City[] =>
  locations
    .filter((item): item is LocationItem & { type: "city" } => item.type === "city")
    .map(toCity);

export const getCities = unstable_cache(
  async (): Promise<City[]> => extractCities(),
  ["location:cities"],
  { revalidate: CACHE_REVALIDATE.cities, tags: [CACHE_TAGS.cities] },
);

export const getProvinces = () =>
  locations.filter(
    (item): item is LocationItem & { type: "province" } => item.type === "province",
  );

export const getCountiesByProvince = (provinceId: string | number) =>
  locations.filter(
    (item): item is LocationItem & { type: "county" } =>
      item.type === "county" && matchesId(item.province_id ?? item.parent_id, provinceId),
  );

export const getDistrictsByCounty = (countyId: string | number) =>
  locations.filter(
    (item): item is LocationItem & { type: "district" } =>
      item.type === "district" && matchesId(item.county_id ?? item.parent_id, countyId),
  );

export const getCitiesByDistrict = (districtId: string | number) =>
  locations.filter(
    (item): item is LocationItem & { type: "city" } =>
      item.type === "city" && matchesId(item.district_id ?? item.parent_id, districtId),
  );

export const getRuralByDistrict = (districtId: string | number) =>
  locations.filter(
    (item): item is LocationItem & { type: "rural" } =>
      item.type === "rural" && matchesId(item.district_id ?? item.parent_id, districtId),
  );

export const getLocationById = (id: string | number) =>
  locations.find((item) => matchesId(item.id, id)) ?? null;
