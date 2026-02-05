import { NextResponse } from "next/server";

import { NO_STORE_HEADERS } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const currentYear = new Date().getFullYear();

export async function GET() {
  const [genres, countryRows, ageRows, yearAgg] = await Promise.all([
    prisma.genre.findMany({
      select: { id: true, slug: true, nameFa: true, nameEn: true },
      orderBy: { nameFa: "asc" },
    }),
    prisma.movie.findMany({
      where: { country: { notIn: [""], not: null } },
      select: { country: true },
      distinct: ["country"],
    }),
    prisma.movie.findMany({
      where: { ageRange: { not: "" } },
      select: { ageRange: true },
      distinct: ["ageRange"],
    }),
    prisma.movie.aggregate({
      _min: { yearReleased: true },
      _max: { yearReleased: true },
    }),
  ]);

  const countries = countryRows
    .map((row) => row.country)
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.trim())
    .sort((a, b) => a.localeCompare(b, "fa"));

  const ageRanges = ageRows
    .map((row) => row.ageRange)
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.trim())
    .sort((a, b) => a.localeCompare(b, "fa"));

  const yearMin = yearAgg._min.yearReleased ?? 1888;
  const yearMax = yearAgg._max.yearReleased ?? currentYear;

  return NextResponse.json(
    {
      genres,
      countries,
      ageRanges,
      yearMin,
      yearMax,
    },
    { headers: NO_STORE_HEADERS },
  );
}
