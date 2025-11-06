import "server-only";

import type { ProviderName } from "../provider.types";

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

export type ProviderAdapter = {
  start: (args: StartArgs) => Promise<StartResult> | StartResult;
  parseWebhook: (payload: unknown) => ParseSuccess | ParseFailure;
};

export type { ProviderName };
