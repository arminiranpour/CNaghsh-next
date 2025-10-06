export class InsufficientJobCreditsError extends Error {
  readonly code = "INSUFFICIENT_JOB_CREDITS" as const;

  constructor(message = "Insufficient job credits available") {
    super(message);
    this.name = "InsufficientJobCreditsError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ExpiredJobCreditsError extends Error {
  readonly code = "EXPIRED_JOB_CREDITS" as const;

  constructor(message = "Job credits have expired") {
    super(message);
    this.name = "ExpiredJobCreditsError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NoEntitlementError extends Error {
  readonly code = "NO_JOB_POST_ENTITLEMENT" as const;

  constructor(message = "No job post entitlement found") {
    super(message);
    this.name = "NoEntitlementError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TransientConcurrencyError extends Error {
  readonly code = "JOB_CREDIT_CONCURRENCY" as const;

  constructor(message = "Concurrent job credit consumption detected") {
    super(message);
    this.name = "TransientConcurrencyError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
