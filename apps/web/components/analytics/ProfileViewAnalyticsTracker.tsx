"use client";

import { useEffect } from "react";

import { CONSENT_GRANTED_EVENT, hasConsent, track } from "@/lib/analytics/provider";

type ProfileViewAnalyticsTrackerProps = {
  city?: string | null;
};

export function ProfileViewAnalyticsTracker({ city }: ProfileViewAnalyticsTrackerProps) {
  useEffect(() => {
    const emit = () => {
      const payload = city ? { city } : undefined;
      track("profile:view", payload);
    };

    if (hasConsent()) {
      emit();
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const handler = () => {
      emit();
    };

    window.addEventListener(CONSENT_GRANTED_EVENT, handler, { once: true });

    return () => {
      window.removeEventListener(CONSENT_GRANTED_EVENT, handler);
    };
  }, [city]);

  return null;
}
