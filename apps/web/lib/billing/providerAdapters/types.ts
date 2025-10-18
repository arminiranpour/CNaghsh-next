type StartArgs = {
  sessionId: string;
  amount: number;
  currency: "IRR";
  returnUrl: string;
};

type StartResult = {
  redirectUrl: string;
};

type ParseSuccess = {
  ok: true;
  providerRef: string;
  paid: boolean;
};

type ParseFailure = {
  ok: false;
  reason: string;
};

export type ProviderName = "zarinpal" | "idpay" | "nextpay";

export type ProviderAdapter = {
  start: (args: StartArgs) => StartResult;
  parseWebhook: (payload: unknown) => ParseSuccess | ParseFailure;
};