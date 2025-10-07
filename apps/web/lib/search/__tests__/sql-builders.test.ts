import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAGE_SIZE,
  buildTsQuery,
  resolveJobSort,
  resolvePagination,
  resolveProfileSort,
} from "../sql";

function sqlToString(fragment: Prisma.Sql): string {
  return fragment.strings.join("");
}

describe("buildTsQuery", () => {
  it("normalizes and parameterizes values", () => {
    const fragment = buildTsQuery("  سلام دنیا  ");

    expect(fragment.values).toEqual(["سلام دنیا"]);
    expect(sqlToString(fragment)).toContain(
      "plainto_tsquery('simple', fa_unaccent(",
    );
  });

  it("throws on empty input", () => {
    expect(() => buildTsQuery("   ")).toThrowError();
  });
});

describe("resolvePagination", () => {
  it("applies defaults", () => {
    expect(resolvePagination({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      offset: 0,
    });
  });

  it("caps values to sensible bounds", () => {
    expect(
      resolvePagination({
        page: -1,
        pageSize: 0,
        defaultPageSize: 20,
      }),
    ).toEqual({
      page: 1,
      pageSize: 20,
      offset: 0,
    });

    expect(
      resolvePagination({
        page: 3,
        pageSize: 15,
      }),
    ).toEqual({
      page: 3,
      pageSize: 15,
      offset: 30,
    });
  });
});

describe("resolveProfileSort", () => {
  it("uses rank for relevance", () => {
    const clause = resolveProfileSort("relevance", true);
    expect(sqlToString(clause)).toContain("ORDER BY rank DESC");
  });

  it("falls back to updatedAt when no query", () => {
    const clause = resolveProfileSort(undefined, false);
    expect(sqlToString(clause)).toContain("ORDER BY p.\"updatedAt\" DESC");
  });
});

describe("resolveJobSort", () => {
  it("prioritizes featured jobs", () => {
    const clause = resolveJobSort("featured", false);
    expect(sqlToString(clause)).toContain("ORDER BY (j.\"featuredUntil\" IS NOT NULL) DESC");
  });

  it("uses rank when relevant", () => {
    const clause = resolveJobSort("relevance", true);
    expect(sqlToString(clause)).toContain("ORDER BY rank DESC");
  });
});
