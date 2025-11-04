"use client";
import React from "react";

export class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  componentDidCatch(error: any, info: any) {
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
