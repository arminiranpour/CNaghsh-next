"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import type { CheckoutSessionResponse } from "./types";

type StatusIconProps = {
  status: CheckoutSessionResponse["status"];
};

const iconStyles: Record<CheckoutSessionResponse["status"], string> = {
  STARTED: "text-primary",
  PENDING: "text-primary",
  SUCCESS: "text-emerald-500",
  FAILED: "text-destructive",
};

export function StatusIcon({ status }: StatusIconProps) {
  const className = `flex h-16 w-16 items-center justify-center rounded-full bg-muted ${iconStyles[status]}`;

  switch (status) {
    case "SUCCESS":
      return (
        <div className={className}>
          <CheckCircle2 className="h-10 w-10" strokeWidth={1.8} />
        </div>
      );
    case "FAILED":
      return (
        <div className={className}>
          <XCircle className="h-10 w-10" strokeWidth={1.8} />
        </div>
      );
    default:
      return (
        <div className={className}>
          <Loader2 className="h-10 w-10 animate-spin" strokeWidth={1.8} />
        </div>
      );
  }
}