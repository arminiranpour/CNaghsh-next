export type UploadMode = "signed-put" | "multipart";

export type UploadInitResponse = {
  ok: true;
  mediaId: string;
  mode: UploadMode;
  sourceKey: string;
  signedUrl?: string;
  maxSingleUploadBytes: number;
  next: { checkStatusUrl: string; finalizeUrl?: string };
};

export type UploadErrorCode =
  | "INVALID_MIME"
  | "TOO_LARGE"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "DURATION_EXCEEDED"
  | "UNKNOWN";

export type UploadErrorResponse = {
  ok: false;
  errorCode: UploadErrorCode;
  messageFa: string;
};

export type UploadResponse = UploadInitResponse | UploadErrorResponse;
