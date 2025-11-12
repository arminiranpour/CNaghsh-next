"use client";

import * as React from "react";

// Set NEXT_PUBLIC_DEBUG_SLOT=1 in apps/web/.env.local to enable
const ENABLED = process.env.NEXT_PUBLIC_DEBUG_SLOT === "1";

type ReactChildrenOnly = typeof React.Children.only;

type NamedComponent = {
  displayName?: string;
  name?: string;
};

const getElementDisplayName = (element: React.ReactElement): string | undefined => {
  const { type } = element;
  if (typeof type === "string") {
    return type;
  }

  if (typeof type === "function" || (typeof type === "object" && type !== null)) {
    const named = type as NamedComponent;
    return named.displayName ?? named.name;
  }

  return undefined;
};

if (ENABLED) {
  const originalOnly = React.Children.only.bind(React.Children) as ReactChildrenOnly;
  const reactChildren = React.Children as typeof React.Children & {
    only: ReactChildrenOnly;
  };

  reactChildren.only = (child) => {
    try {
      return originalOnly(child);
    } catch (error) {
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
          childPreview: (() => {
            const previewSource = child as unknown;
            if (typeof previewSource === "string") {
              return previewSource.slice(0, 120);
            }
            if (React.isValidElement(previewSource)) {
              return getElementDisplayName(previewSource) ?? previewSource.type;
            }
            return previewSource;
          })(),
        },
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
