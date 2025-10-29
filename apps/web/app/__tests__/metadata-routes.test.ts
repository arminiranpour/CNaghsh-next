import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let robots: typeof import("../robots").default;
let sitemap: typeof import("../sitemap").default;

const ORIGINAL_PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const ORIGINAL_NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

describe("metadata routes", () => {
  beforeEach(async () => {
    process.env.PUBLIC_BASE_URL = "https://example.com";
    process.env.NEXT_PUBLIC_BASE_URL = "https://example.com";
    vi.resetModules();
    ({ default: robots } = await import("../robots"));
    ({ default: sitemap } = await import("../sitemap"));
  });

  afterEach(() => {
    if (ORIGINAL_PUBLIC_BASE_URL === undefined) {
      delete process.env.PUBLIC_BASE_URL;
    } else {
      process.env.PUBLIC_BASE_URL = ORIGINAL_PUBLIC_BASE_URL;
    }

    if (ORIGINAL_NEXT_PUBLIC_BASE_URL === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_BASE_URL = ORIGINAL_NEXT_PUBLIC_BASE_URL;
    }

    vi.resetModules();
  });

  it("builds robots.txt configuration", () => {
    const result = robots();

    expect(result.host).toBe("https://example.com");
    expect(result.sitemap).toBe("https://example.com/sitemap.xml");
    const rules = result.rules
      ? Array.isArray(result.rules)
        ? result.rules
        : [result.rules]
      : [];
    const disallowEntries = rules.flatMap((rule) =>
      Array.isArray(rule?.disallow)
        ? rule.disallow
        : rule?.disallow
          ? [rule.disallow]
          : [],
    );

    expect(disallowEntries).toContain("/admin");
  });

  it("creates sitemap index entries", () => {
    const result = sitemap();

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "url": "https://example.com/sitemap-static.xml",
        },
        {
          "url": "https://example.com/profiles/sitemap.xml",
        },
        {
          "url": "https://example.com/jobs/sitemap.xml",
        },
      ]
    `);
  });
});
