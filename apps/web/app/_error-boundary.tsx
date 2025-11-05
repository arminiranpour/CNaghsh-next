"use client";
import React from "react";

type RootErrorBoundaryProps = { children: React.ReactNode };
type RootErrorBoundaryState = { hasError: boolean };

export class RootErrorBoundary extends React.Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = { hasError: false };

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("💥 Caught error:", error);
    // eslint-disable-next-line no-console
    console.error("🧱 Component stack:", info?.componentStack);
    this.setState({ hasError: true });
  }
  render() {
    return this.props.children;
  }
}
