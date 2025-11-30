import { describe, expect, it } from "vitest";

import { normalizeSearchParams } from "../normalizeSearchParams";

describe("normalizeSearchParams", () => {
  it("returns an empty object when no params are provided", () => {
    expect(normalizeSearchParams(new URLSearchParams())).toEqual({});
  });

  it("parses comma-separated arrays and trims values", () => {
    const result = normalizeSearchParams({
      skills: [" lighting , camera ", "editing"],
      city: " tehran ",
      query: "  stage hand  ",
      lang: " fa , en ",
      accent: "Tehran , tehran ",
    });

    expect(result).toEqual({
      query: "stage hand",
      city: "tehran",
      skills: ["lighting", "camera", "editing"],
      lang: ["fa", "en"],
      accent: ["Tehran", "tehran"],
    });
  });

  it("coerces page to a number greater than or equal to 1", () => {
    expect(
      normalizeSearchParams({
        page: " 2 ",
      }),
    ).toMatchObject({ page: 2 });

    expect(
      normalizeSearchParams({
        page: "0",
      }),
    ).not.toHaveProperty("page");
  });

  it("drops empty, undefined, or invalid values", () => {
    const result = normalizeSearchParams({
      gender: "",
      remote: "yes",
      featured: undefined,
      payType: "invalid",
      skills: ",,",
      sort: "  ",
      ageMin: "200",
    });

    expect(result).toEqual({});
  });

  it("parses typed filters", () => {
    const result = normalizeSearchParams({
      gender: "male,female,male",
      edu: "bachelor , master ",
      ageMin: " 18 ",
      ageMax: "30",
    });

    expect(result).toEqual({
      gender: ["male", "female"],
      edu: ["bachelor", "master"],
      ageMin: 18,
      ageMax: 30,
    });
  });
});
