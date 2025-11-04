"use client";

import * as React from "react";

// Set NEXT_PUBLIC_DEBUG_SLOT=1 in apps/web/.env.local to enable
const ENABLED = process.env.NEXT_PUBLIC_DEBUG_SLOT === "1";

if (ENABLED) {
  const originalOnly = (React.Children.only as any).bind(React.Children);
  (React.Children as any).only = (child: any) => {
    try {
      return originalOnly(child);
    } catch (e) {
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
          childPreview:
            typeof child === "string"
              ? child.slice(0, 120)
              : React.isValidElement(child)
              ? (child.type as any)?.displayName || (child.type as any)?.name || child.type
              : child,
        }
      );
      // Show a JS stack (points to your component)
      // eslint-disable-next-line no-console
      console.trace("Stack where invalid child came from:");
      throw e;
    }
  };
}

export function SlotDebugProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
