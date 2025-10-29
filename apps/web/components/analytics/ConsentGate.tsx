"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Script from "next/script";

import {
  CONSENT_GRANTED_EVENT,
  hasConsent,
  setConsentGranted,
  track,
} from "@/lib/analytics/provider";
import { isEnabled } from "@/lib/flags";

const STORAGE_KEY = "analytics:consent";
const ANALYTICS_FLAG = "analytics";
const analyticsEnabled = isEnabled(ANALYTICS_FLAG);

function resolveAnalyticsDomain(): string {
  const analyticsBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.PUBLIC_BASE_URL ??
    process.env.BASE_URL ??
    process.env.NEXTAUTH_URL;

  if (!analyticsBaseUrl) {
    throw new Error(
      "[analytics] NEXT_PUBLIC_BASE_URL (or equivalent) must be configured to enable analytics.",
    );
  }

  const parsed = new URL(analyticsBaseUrl);
  return parsed.hostname;
}

type ConsentState = "unknown" | "granted" | "denied";

export function ConsentGate() {
  const [consent, setConsent] = useState<ConsentState>("unknown");
  const [isHydrated, setIsHydrated] = useState(false);

  const analyticsDomain = useMemo(() => resolveAnalyticsDomain(), []);

  const dispatchConsentGranted = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(new Event(CONSENT_GRANTED_EVENT));
  }, []);

  useEffect(() => {
    setIsHydrated(true);

    if (!analyticsEnabled) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored === "granted") {
      setConsent("granted");
      if (!hasConsent()) {
        setConsentGranted(true);
        dispatchConsentGranted();
      }
    } else if (stored === "denied") {
      setConsent("denied");
    } else {
      setConsent("unknown");
    }
  }, [dispatchConsentGranted]);

  const handleDecline = useCallback(() => {
    if (!analyticsEnabled) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, "denied");
    setConsent("denied");
  }, []);

  const handleAllow = useCallback(() => {
    if (!analyticsEnabled) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, "granted");
    setConsentGranted(true);
    setConsent("granted");
    dispatchConsentGranted();
    track(CONSENT_GRANTED_EVENT);
  }, [dispatchConsentGranted]);

  const shouldRenderBanner =
    analyticsEnabled && isHydrated && consent === "unknown";

  return (
    <>
      {analyticsEnabled && consent === "granted" ? (
        <Script
          src="https://plausible.io/js/script.js"
          data-domain={analyticsDomain}
          strategy="lazyOnload"
        />
      ) : null}

      {shouldRenderBanner ? (
        <div className="bg-card border-b border-border px-4 py-3 text-sm text-foreground">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              برای بهبود تجربه شما، اجازه تحلیل رفتار ناشناس را می‌خواهیم. داده‌های شخصی ذخیره نمی‌شوند.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-input px-3 py-1 text-sm"
                onClick={handleDecline}
              >
                رد کردن
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground shadow"
                onClick={handleAllow}
              >
                اجازه می‌دهم
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
