export type ProviderName = "zarinpal" | "idpay" | "nextpay";

export type ProviderCheckoutSession = {
  sessionId: string;
  redirectUrl: string;
  returnUrl: string;
};
