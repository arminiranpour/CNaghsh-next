"use client";

import Script from "next/script";

export function JsonLd({ data }: { data: unknown }) {
  return (
    <Script
      id={Array.isArray(data) ? "ld-json-list" : "ld-json"}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

