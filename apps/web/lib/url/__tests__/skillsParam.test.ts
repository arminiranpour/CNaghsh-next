import { describe, expect, it } from "vitest";

import { parseSkillsSearchParam, setSkillsSearchParam } from "../skillsParam";

describe("skills search param helpers", () => {
  it("parses comma separated values", () => {
    const result = parseSkillsSearchParam({ skills: "singing_pop, music_instrument_guitar" });

    expect(result).toEqual(["singing_pop", "music_instrument_guitar"]);
  });

  it("deduplicates and trims when serializing", () => {
    const params = new URLSearchParams();

    setSkillsSearchParam(params, ["singing_pop", " ", "singing_pop", "dance_modern"]);

    expect(params.get("skills")).toBe("singing_pop,dance_modern");
  });

  it("removes the param when no skills remain", () => {
    const params = new URLSearchParams();
    params.set("skills", "existing");

    setSkillsSearchParam(params, []);

    expect(params.has("skills")).toBe(false);
  });
});
