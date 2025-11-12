import { timingSafeEqual } from "node:crypto";

import { Provider } from "@/lib/prismaEnums";

export type ProviderName = keyof typeof Provider;
export type WebhookStatus = "PAID" | "FAILED" | "PENDING" | "REFUNDED";

type Payload = Record<string, unknown>;

type AmountCurrency = {
  amount: number;
  currency: string;
};

const FALLBACK_CURRENCY = "IRR" as const;

const normalizeMap = (payload: Payload) => {
  const entries = new Map<string, unknown>();
  for (const [key, value] of Object.entries(payload)) {
    entries.set(key.toLowerCase(), value);
  }
  return entries;
};

const pickString = (payload: Payload, keys: string[]): string | null => {
  const normalized = normalizeMap(payload);
  for (const key of keys) {
    const exact = payload[key];
    if (typeof exact === "string" && exact.trim().length > 0) {
      return exact;
    }
    const fallback = normalized.get(key.toLowerCase());
    if (typeof fallback === "string" && fallback.trim().length > 0) {
      return fallback;
    }
  }
  return null;
};

const pickNumber = (payload: Payload, keys: string[]): number | null => {
  const normalized = normalizeMap(payload);
  for (const key of keys) {
    const exact = payload[key];
    if (typeof exact === "number" && Number.isFinite(exact)) {
      return exact;
    }
    if (typeof exact === "string" && exact.trim().length > 0) {
      const parsed = Number(exact);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    const fallback = normalized.get(key.toLowerCase());
    if (typeof fallback === "number" && Number.isFinite(fallback)) {
      return fallback;
    }
    if (typeof fallback === "string" && fallback.trim().length > 0) {
      const parsed = Number(fallback);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const ensureString = (value: unknown, error: string) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(error);
  }
  return value;
};

const coerceAmount = (value: number | null): number => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  return 0;
};

export const extractExternalId = (
  provider: ProviderName,
  payload: Payload,
): string => {
  let id: string | null = null;

  if (provider === "zarinpal") {
    id = pickString(payload, ["authority", "Authority", "externalId"]);
  } else if (provider === "idpay") {
    id = pickString(payload, ["id", "ID", "payment_id"]);
  } else if (provider === "nextpay") {
    id = pickString(payload, ["trans_id", "transaction_id", "transId", "externalId"]);
  }

  if (!id) {
    const providerRef = pickString(payload, ["providerRef", "ref_id", "refId", "track_id", "order_id"]);
    const sessionId = pickString(payload, ["sessionId", "session_id"]);
    if (providerRef && sessionId) {
      return `${sessionId}:${providerRef}`;
    }
  }

  return ensureString(id, "Missing externalId");
};

export const extractProviderRef = (
  provider: ProviderName,
  payload: Payload,
): string => {
  let ref: string | null = null;

  if (provider === "zarinpal") {
    ref = pickString(payload, ["ref_id", "refId", "providerRef"]);
  } else if (provider === "idpay") {
    ref = pickString(payload, ["track_id", "order_id", "providerRef"]);
  } else if (provider === "nextpay") {
    ref = pickString(payload, ["order_id", "orderId", "providerRef"]);
  }

  if (!ref) {
    ref = pickString(payload, ["providerRef"]);
  }

  return ensureString(ref, "Missing providerRef");
};

export const extractAmountCurrency = (
  provider: ProviderName,
  payload: Payload,
): AmountCurrency => {
  const amountKeys = ["amount", "Amount", "price", "Price"];
  const amount = coerceAmount(pickNumber(payload, amountKeys));
  const currency =
    pickString(payload, ["currency", "Currency", "curr", "Curr"]) ?? FALLBACK_CURRENCY;

  return { amount, currency } satisfies AmountCurrency;
};

const normalizeStatus = (value: string | number | null): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }
  return "";
};

export const mapProviderStatus = (
  provider: ProviderName,
  payload: Payload,
): WebhookStatus => {
  if (provider === "zarinpal") {
    const raw = normalizeStatus(pickString(payload, ["status", "Status", "code"]));
    if (raw === "ok" || raw === "paid" || raw === "100") {
      return "PAID";
    }
    if (raw === "pending" || raw === "0") {
      return "PENDING";
    }
    if (raw === "refunded" || raw === "refund" || raw === "200") {
      return "REFUNDED";
    }
    return "FAILED";
  }

  if (provider === "idpay") {
    const numeric = pickNumber(payload, ["status", "Status", "state"]);
    if (numeric !== null) {
      if (numeric >= 200) {
        return "REFUNDED";
      }
      if (numeric >= 100) {
        return "PAID";
      }
      if (numeric >= 0) {
        return "PENDING";
      }
      return "FAILED";
    }
    const raw = normalizeStatus(pickString(payload, ["status", "state"]));
    if (raw === "paid" || raw === "ok") {
      return "PAID";
    }
    if (raw === "refunded" || raw === "refund") {
      return "REFUNDED";
    }
    if (raw === "pending") {
      return "PENDING";
    }
    return "FAILED";
  }

  const code = pickNumber(payload, ["code", "status", "result"]);
  if (code !== null) {
    if (code === 0) {
      return "PAID";
    }
    if (code === 20) {
      return "REFUNDED";
    }
    if (code > 0) {
      return "PENDING";
    }
    return "FAILED";
  }

  const raw = normalizeStatus(pickString(payload, ["status", "result", "state"]));
  if (raw === "paid" || raw === "ok") {
    return "PAID";
  }
  if (raw === "refunded" || raw === "refund") {
    return "REFUNDED";
  }
  if (raw === "pending") {
    return "PENDING";
  }
  return "FAILED";
};

const getSecret = (provider: ProviderName): string | undefined => {
  if (provider === "zarinpal") {
    return process.env.ZARINPAL_WEBHOOK_SECRET ?? process.env.WEBHOOK_SHARED_SECRET ?? undefined;
  }
  if (provider === "idpay") {
    return process.env.IDPAY_WEBHOOK_SECRET ?? process.env.WEBHOOK_SHARED_SECRET ?? undefined;
  }
  if (provider === "nextpay") {
    return process.env.NEXTPAY_WEBHOOK_SECRET ?? process.env.WEBHOOK_SHARED_SECRET ?? undefined;
  }
  return process.env.WEBHOOK_SHARED_SECRET ?? undefined;
};

export const verifySignature = (
  provider: ProviderName,
  signature: string | null,
): boolean => {
  const secret = getSecret(provider);

  if (!secret) {
    return true;
  }

  if (typeof signature !== "string" || signature.length === 0) {
    return false;
  }

  const expected = Buffer.from(secret);
  const provided = Buffer.from(signature);

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
};
