import { beforeEach, describe, expect, it } from "vitest";

import { getEnabledFlags, isEnabled } from "../../flags";

describe("feature flags", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_FLAGS;
    delete process.env.FLAGS;
  });

  it("returns false when no flags are defined", () => {
    expect(isEnabled("analytics")).toBe(false);
  });

  it("reads flags from public environment", () => {
    process.env.NEXT_PUBLIC_FLAGS = "analytics, canary";
    expect(isEnabled("analytics")).toBe(true);
    expect(isEnabled("canary")).toBe(true);
    expect(isEnabled("sentry")).toBe(false);
  });

  it("merges server-side flags", () => {
    process.env.NEXT_PUBLIC_FLAGS = "analytics";
    process.env.FLAGS = "sentry";

    expect(isEnabled("analytics")).toBe(true);
    expect(isEnabled("sentry")).toBe(true);
  });

  it("ignores casing and whitespace", () => {
    process.env.FLAGS = "  Canary ,  SENTRY  ";

    expect(isEnabled("canary")).toBe(true);
    expect(isEnabled("sentry")).toBe(true);
  });

  it("provides a sorted list of flags", () => {
    process.env.NEXT_PUBLIC_FLAGS = "canary,analytics";
    process.env.FLAGS = "sentry";

    expect(getEnabledFlags()).toEqual(["analytics", "canary", "sentry"]);
  });
});
