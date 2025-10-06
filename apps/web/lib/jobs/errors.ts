export class JobNotFoundError extends Error {
  readonly code = "JOB_NOT_FOUND" as const;

  constructor(message = "Job not found") {
    super(message);
    this.name = "JobNotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class JobAccessDeniedError extends Error {
  readonly code = "JOB_ACCESS_DENIED" as const;

  constructor(message = "Access to this job is not permitted") {
    super(message);
    this.name = "JobAccessDeniedError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class JobStatusError extends Error {
  readonly code = "JOB_STATUS_INVALID" as const;

  constructor(message = "Job status does not allow this action") {
    super(message);
    this.name = "JobStatusError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
