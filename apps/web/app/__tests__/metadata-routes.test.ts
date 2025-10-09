import { afterEach, beforeEach, describe, expect, it } from "vitest";

import robots from "../robots";
import sitemap from "../sitemap";

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_APP_URL;

describe("metadata routes", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_ENV;
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
