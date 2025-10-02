export type CheckoutStatus = "STARTED" | "PENDING" | "SUCCESS" | "FAILED";

export type CheckoutSessionResponse = {
  id: string;
  status: CheckoutStatus;
  redirectUrl: string | null;
};

export type CheckoutSessionError = {
  error: string;
};

export type CheckoutSessionResult =
  | CheckoutSessionResponse
  | CheckoutSessionError
  | null;