"use client";

import { useEffect } from "react";

import { CONSENT_GRANTED_EVENT, hasConsent, track } from "@/lib/analytics/provider";

type JobAnalytics = {
  category?: string | null;
  city?: string | null;
  payType?: string | null;
  remote?: boolean | null;
};

type JobViewTrackerProps = {
  jobId: string;
  analytics?: JobAnalytics;
};

export function JobViewTracker({ jobId, analytics }: JobViewTrackerProps) {
  useEffect(() => {
    if (!jobId) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/jobs/${jobId}/views`, {
      method: "POST",
      signal: controller.signal,
    }).catch(() => {
      // Ignore view tracking errors in the UI
    });

    const emit = () => {
      const payload = {
        category: analytics?.category ?? undefined,
        city: analytics?.city ?? undefined,
        payType: analytics?.payType ?? undefined,
        remote: analytics?.remote ?? undefined,
      };

      track("job:view", payload);
    };

    if (hasConsent()) {
      emit();
    } else if (typeof window !== "undefined") {
      const handler = () => {
        emit();
      };

      window.addEventListener(CONSENT_GRANTED_EVENT, handler, { once: true });

      return () => {
        controller.abort();
        window.removeEventListener(CONSENT_GRANTED_EVENT, handler);
      };
    }

    return () => {
      controller.abort();
    };
  }, [jobId, analytics?.category, analytics?.city, analytics?.payType, analytics?.remote]);

  return null;
}
