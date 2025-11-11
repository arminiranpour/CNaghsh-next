export type AnalyticsEventProps = Record<string, unknown>;

export const CONSENT_GRANTED_EVENT = "analytics:consent_granted";

type AnalyticsAdapter = {
  track: (event: string, props?: AnalyticsEventProps) => void;
  identify: (userId?: string, traits?: AnalyticsEventProps) => void;
};

let consentGranted = false;
let adapter: AnalyticsAdapter | null = null;

const ALLOWED_PROP_KEYS = new Set([
  "city",
  "category",
  "payType",
  "remote",
  "sort",
  "page",
]);

const MAX_STRING_LENGTH = 120;

function isDoNotTrackEnabled(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return navigator.doNotTrack === "1" || navigator.doNotTrack === "yes";
}

function isAnalyticsDisabledEnv(): boolean {
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    return false;
  }

  return process.env.ANALYTICS_DISABLED === "1";
}

function ensureAdapter(): AnalyticsAdapter {
  if (adapter) {
    return adapter;
  }

  adapter = plausibleAdapter;
  return adapter;
}

function shouldTrack(): boolean {
  if (!consentGranted) {
    return false;
  }

  if (isDoNotTrackEnabled()) {
    return false;
  }

  if (isAnalyticsDisabledEnv()) {
    return false;
  }

  return true;
}

function sanitizeValue(value: unknown): unknown {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value.trim().slice(0, MAX_STRING_LENGTH);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 5)
      .map((item) => sanitizeValue(item))
      .filter((item) => item !== undefined);
  }

  return undefined;
}

function sanitizeProps(props?: AnalyticsEventProps): AnalyticsEventProps | undefined {
  if (!props) {
    return undefined;
  }

  const entries = Object.entries(props).filter(([key]) => ALLOWED_PROP_KEYS.has(key));

  if (entries.length === 0) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of entries) {
    const normalized = sanitizeValue(value);
    if (normalized !== undefined) {
      sanitized[key] = normalized;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function setConsentGranted(granted: boolean): void {
  consentGranted = granted;
}

export function hasConsent(): boolean {
  return consentGranted;
}

export function setAnalyticsAdapter(nextAdapter: AnalyticsAdapter | null): void {
  adapter = nextAdapter;
}

export function track(event: string, props?: AnalyticsEventProps): void {
  if (!shouldTrack()) {
    return;
  }

  const sanitizedProps = sanitizeProps(props);
  ensureAdapter().track(event, sanitizedProps);
}

export function identify(userId?: string, traits?: AnalyticsEventProps): void {
  if (!shouldTrack()) {
    return;
  }

  ensureAdapter().identify(userId, sanitizeProps(traits));
}

export function resetAnalyticsStateForTests(): void {
  consentGranted = false;
  adapter = plausibleAdapter;
}

type PlausibleFn = (event: string, options?: { props?: AnalyticsEventProps }) => void;

const plausibleAdapter: AnalyticsAdapter = {
  track(event, props) {
    if (typeof window === "undefined") {
      return;
    }

    const plausible = window.plausible as PlausibleFn | undefined;
    plausible?.(event, props ? { props } : undefined);
  },
  identify() {
    // Plausible does not support identify semantics.
  },
};

export const ga4Adapter: AnalyticsAdapter = {
  track(event, props) {
    if (typeof window === "undefined") {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataLayer = (window as any).dataLayer as Array<unknown> | undefined;
    dataLayer?.push({
      event,
      ...props,
    });
  },
  identify(userId, traits) {
    if (typeof window === "undefined") {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataLayer = (window as any).dataLayer as Array<unknown> | undefined;
    dataLayer?.push({
      event: "identify",
      userId,
      traits,
    });
  },
};

declare global {
  interface Window {
    plausible?: PlausibleFn;
    dataLayer?: Array<unknown>;
  }
}
