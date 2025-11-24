// apps/web/lib/location/cities.ts
import allLocations from "../../public/cities/all.json";

export type LocationType = "province" | "county" | "district" | "city" | "rural";

export type LocationItem = {
  id: number;
  name: string;
  type: LocationType;
  parent_id: number | null;
  // add any extra fields you have (slug, code, etc.)
};

// Cast JSON to typed array
const locations = allLocations as LocationItem[];

// Basic filters
export const getProvinces = () =>
  locations.filter((item) => item.type === "province");

export const getCountiesByProvince = (provinceId: number) =>
  locations.filter(
    (item) => item.type === "county" && item.parent_id === provinceId,
  );

export const getDistrictsByCounty = (countyId: number) =>
  locations.filter(
    (item) => item.type === "district" && item.parent_id === countyId,
  );

export const getCitiesByDistrict = (districtId: number) =>
  locations.filter(
    (item) => item.type === "city" && item.parent_id === districtId,
  );

export const getRuralByDistrict = (districtId: number) =>
  locations.filter(
    (item) => item.type === "rural" && item.parent_id === districtId,
  );

// Optional: by id
export const getLocationById = (id: number) =>
  locations.find((item) => item.id === id) ?? null;

