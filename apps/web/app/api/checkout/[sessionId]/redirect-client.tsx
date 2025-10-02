"use client";

import { useEffect } from "react";

type GatewayRedirectProps = {
  redirectUrl: string;
};

export function GatewayRedirect({ redirectUrl }: GatewayRedirectProps) {
  useEffect(() => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [redirectUrl]);

  return null;
}