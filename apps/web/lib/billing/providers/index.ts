import { idpay } from "./idpay";
import { nextpay } from "./nextpay";
import { ProviderAdapter, ProviderName } from "./types";
import { zarinpal } from "./zarinpal";

export const providers: Record<ProviderName, ProviderAdapter> = {
  zarinpal,
  idpay,
  nextpay,
};