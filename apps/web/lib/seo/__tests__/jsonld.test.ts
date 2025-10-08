import { describe, expect, it } from "vitest";

import {
  breadcrumbsJsonLd,
  jobPostingJsonLd,
  profilePersonJsonLd,
  websiteJsonLd,
} from "../jsonld";

const BASE_URL = "https://example.com";

describe("seo jsonld helpers", () => {
  it("creates job posting schema with remote details", () => {
    const json = jobPostingJsonLd({
      id: "job123",
      title: "بازیگر سینما",
      description: "<p>شرح کامل\nپروژه</p>",
      url: `${BASE_URL}/jobs/job123`,
      organizationName: "استودیو صحنه",
      remote: true,
      cityName: "تهران",
      applicantRegionName: "Iran",
      datePosted: new Date("2024-01-10T12:00:00.000Z"),
      validThrough: "2024-02-01T00:00:00.000Z",
      baseSalary: {
        currency: "IRR",
        value: 8000000,
        unitText: "MONTH",
      },
    });

    expect(json).toMatchInlineSnapshot(`
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "applicantLocationRequirements": [
          {
            "@type": "Country",
            "name": "Iran",
          },
        ],
        "baseSalary": {
          "@type": "MonetaryAmount",
          "currency": "IRR",
          "value": {
            "@type": "QuantitativeValue",
            "unitText": "MONTH",
            "value": 8000000,
          },
        },
        "datePosted": "2024-01-10T12:00:00.000Z",
        "description": "شرح کامل پروژه",
        "hiringOrganization": {
          "@type": "Organization",
          "name": "استودیو صحنه",
        },
        "identifier": {
          "@type": "PropertyValue",
          "name": "internal",
          "value": "job123",
        },
        "jobLocationType": "TELECOMMUTE",
        "title": "بازیگر سینما",
        "url": "https://example.com/jobs/job123",
        "validThrough": "2024-02-01T00:00:00.000Z",
      }
    `);
  });

  it("creates person schema with breadcrumbs", () => {
    const personJson = profilePersonJsonLd({
      name: "نگار رضایی",
      url: `${BASE_URL}/profiles/abc`,
      stageName: "نگار ر",
      avatarUrl: `${BASE_URL}/avatar.png`,
      bio: "بازیگر و صداپیشه",
      cityName: "اصفهان",
      socialLinks: ["https://instagram.com/negaresho"],
    });

    expect(personJson).toMatchInlineSnapshot(`
      {
        "@context": "https://schema.org",
        "@type": "Person",
        "alternateName": "نگار ر",
        "description": "بازیگر و صداپیشه",
        "homeLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "IR",
            "addressLocality": "اصفهان",
          },
          "name": "اصفهان",
        },
        "image": "https://example.com/avatar.png",
        "name": "نگار رضایی",
        "sameAs": [
          "https://instagram.com/negaresho",
        ],
        "url": "https://example.com/profiles/abc",
      }
    `);

    const breadcrumbs = breadcrumbsJsonLd([
      { name: "خانه", item: `${BASE_URL}/` },
      { name: "پروفایل‌ها", item: `${BASE_URL}/profiles` },
      { name: "نگار رضایی", item: `${BASE_URL}/profiles/abc` },
    ]);

    expect(breadcrumbs).toMatchInlineSnapshot(`
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "item": "https://example.com/",
            "name": "خانه",
            "position": 1,
          },
          {
            "@type": "ListItem",
            "item": "https://example.com/profiles",
            "name": "پروفایل‌ها",
            "position": 2,
          },
          {
            "@type": "ListItem",
            "item": "https://example.com/profiles/abc",
            "name": "نگار رضایی",
            "position": 3,
          },
        ],
      }
    `);
  });

  it("creates website schema with dual search actions", () => {
    const json = websiteJsonLd({
      url: BASE_URL,
      searchUrlProfiles: `${BASE_URL}/profiles`,
      searchUrlJobs: `${BASE_URL}/jobs`,
    });

    expect(json).toMatchInlineSnapshot(`
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "صحنه",
        "potentialAction": [
          {
            "@type": "SearchAction",
            "query-input": "required name=search_term_string",
            "target": "https://example.com/profiles?query={search_term_string}",
          },
          {
            "@type": "SearchAction",
            "query-input": "required name=search_term_string",
            "target": "https://example.com/jobs?query={search_term_string}",
          },
        ],
        "url": "https://example.com",
      }
    `);
  });
});
