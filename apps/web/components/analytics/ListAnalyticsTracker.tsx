"use client";

import { useEffect } from "react";

import { CONSENT_GRANTED_EVENT, hasConsent, track } from "@/lib/analytics/provider";

type ListScope = "profiles" | "jobs";

type ListAnalyticsTrackerProps = {
  scope: ListScope;
  query?: string | null;
  city?: string | null;
  category?: string | null;
  payType?: string | null;
  remote?: boolean | null;
  sort?: string | null;
  page?: number | null;
};

function normalizeString(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeBoolean(value?: boolean | null): boolean | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return Boolean(value);
}

export function ListAnalyticsTracker({
  scope,
  query,
  city,
  category,
  payType,
  remote,
  sort,
  page,
}: ListAnalyticsTrackerProps) {
  useEffect(() => {
    function emitEvents() {
      const baseProps = {
        query: normalizeString(query),
        city: normalizeString(city),
        category: normalizeString(category),
        payType: normalizeString(payType),
        remote: normalizeBoolean(remote),
        sort: normalizeString(sort),
        page: typeof page === "number" ? page : undefined,
      } as const;

      const prefix = scope === "profiles" ? "profiles" : "jobs";

      track(`${prefix}:list_view`, baseProps);

      if (baseProps.query) {
        track(`${prefix}:search`, { query: baseProps.query });
      }

      const filterPayload = {
        city: baseProps.city,
        category: baseProps.category,
        payType: baseProps.payType,
        remote: baseProps.remote,
        sort: baseProps.sort,
      };

      if (Object.values(filterPayload).some((value) => value !== undefined && value !== null)) {
        track(`${prefix}:filter_applied`, filterPayload);
      }

      if (baseProps.page && baseProps.page > 1) {
        track(`${prefix}:page_changed`, { page: baseProps.page });
      }
    }

    if (hasConsent()) {
      emitEvents();
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const handler = () => {
      emitEvents();
    };

    window.addEventListener(CONSENT_GRANTED_EVENT, handler, { once: true });

    return () => {
      window.removeEventListener(CONSENT_GRANTED_EVENT, handler);
    };
  }, [scope, query, city, category, payType, remote, sort, page]);

  return null;
}
