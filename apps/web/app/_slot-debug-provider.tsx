"use client";

import * as React from "react";

// Set NEXT_PUBLIC_DEBUG_SLOT=1 in apps/web/.env.local to enable
const ENABLED = process.env.NEXT_PUBLIC_DEBUG_SLOT === "1";

type NamedElementType = React.ElementType & {
  displayName?: string;
  name?: string;
};

const describeElement = (node: React.ReactNode): string => {
  if (typeof node === "string") {
    return node.slice(0, 120);
  }
  if (!React.isValidElement(node)) {
    return typeof node === "object" ? "[object]" : String(node);
  }
  const elementType = node.type as NamedElementType;
  return elementType.displayName ?? elementType.name ?? String(elementType);
};

if (ENABLED) {
  const childrenApi = React.Children as typeof React.Children;
  const originalOnly = childrenApi.only.bind(React.Children) as typeof childrenApi.only;
  childrenApi.only = (child: React.ReactNode) => {
    try {
      return originalOnly(child);
    } catch (error: unknown) {
      // Print helpful info before rethrowing so the overlay shows this log
      // Try to show element type / displayName and a component stack
      // eslint-disable-next-line no-console
      console.error(
        "❌ React.Children.only received an invalid child for a Slot/Trigger.\n" +
          "Most common causes:\n" +
          "- a Fragment <>...</> as direct child of Button asChild / DialogTrigger / etc.\n" +
          "- text/string as child (\"Click me\")\n" +
          "- conditional rendering returning false/null on one branch\n" +
          "- multiple siblings",
        {
          childPreview: describeElement(child),
        }
      );
      // Show a JS stack (points to your component)
      // eslint-disable-next-line no-console
      console.trace("Stack where invalid child came from:");
      throw error;
    }
  };
}

export function SlotDebugProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
