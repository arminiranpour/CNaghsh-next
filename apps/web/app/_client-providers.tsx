"use client";

import * as React from "react";
import { SlotDebugProvider } from "./_slot-debug-provider";
import { RootErrorBoundary } from "./_error-boundary";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <RootErrorBoundary>
      <SlotDebugProvider>{children}</SlotDebugProvider>
    </RootErrorBoundary>
  );
}
