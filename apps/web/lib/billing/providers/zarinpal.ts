import { ProviderAdapter } from "./types";

type ParseResult = ReturnType<ProviderAdapter["parseWebhook"]>;

const getBaseUrl = () => {
  const baseUrl = process.env.PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing PUBLIC_BASE_URL");
  }
  return baseUrl;
};

const parsePayload = (payload: unknown): ParseResult => {
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "Invalid payload" };
  }
  const data = payload as Record<string, unknown>;
  const providerRef = data.providerRef;
  const status = data.status;
  if (typeof providerRef !== "string") {
    return { ok: false, reason: "Missing providerRef" };
  }
  if (status !== "OK" && status !== "FAILED") {
    return { ok: false, reason: "Invalid status" };
  }
  return { ok: true, providerRef, paid: status === "OK" };
};

export const zarinpal: ProviderAdapter = {
  start: ({ sessionId, amount, currency, returnUrl }) => {
    const params = new URLSearchParams({
      session: sessionId,
      provider: "zarinpal",
      amount: String(amount),
      currency,
      returnUrl,
    });
    return {
      redirectUrl: `${getBaseUrl()}/billing/sandbox-redirect?${params.toString()}`,
    };
  },
  parseWebhook: parsePayload,
};