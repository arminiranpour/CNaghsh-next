"use client";

import * as React from "react";
import { Children, Fragment, isValidElement } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/* -------------------- helpers to guarantee a single element for Radix Slot -------------------- */

function isFragmentEl(node: unknown): node is React.ReactElement {
  return isValidElement(node) && node.type === Fragment;
}

function hasExactlyOneChildElement(node: React.ReactNode): node is React.ReactElement {
  if (isValidElement(node) && !isFragmentEl(node)) return true;
  if (Array.isArray(node)) {
    const filtered = node.filter(Boolean);
    return filtered.length === 1 && isValidElement(filtered[0]) && filtered[0].type !== Fragment;
  }
  return false;
}

function wrapInSpan(
  children: React.ReactNode,
  wrapperProps?: React.HTMLAttributes<HTMLSpanElement>
) {
  return <span {...wrapperProps}>{children}</span>;
}

type NamedElementType = React.ElementType & {
  displayName?: string;
  name?: string;
};

const describeElement = (element: React.ReactElement): string => {
  const elementType = element.type as NamedElementType;
  return elementType.displayName ?? elementType.name ?? "element";
};

const describeNode = (node: React.ReactNode): string => {
  if (typeof node === "string") {
    return node.slice(0, 80);
  }
  if (Array.isArray(node)) {
    return Children.toArray(node)
      .map((child) => (isValidElement(child) ? describeElement(child) : typeof child))
      .join(", ");
  }
  if (isValidElement(node)) {
    return describeElement(node);
  }
  return String(node);
};

/**
 * Ensure Slot receives exactly one *element*. If we get text, a Fragment, or multiple nodes,
 * wrap them in a <span>. In dev, log a helpful warning to locate the caller.
 */
function coerceToSingleElement(
  children: React.ReactNode,
  wrapperProps?: React.HTMLAttributes<HTMLSpanElement>
): React.ReactElement {
  // Single non-fragment element → OK
  if (hasExactlyOneChildElement(children)) {
    return children as React.ReactElement;
  }

  // Fragment with a single element → unwrap
  if (isFragmentEl(children)) {
    const fragmentKids = (children.props?.children ?? []) as React.ReactNode;
    if (hasExactlyOneChildElement(fragmentKids)) {
      return fragmentKids as React.ReactElement;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(
      "[Button.asChild] Wrapped non-element or multiple children in <span> for Radix Slot compatibility.",
      {
        type: typeof children,
        count: Array.isArray(children) ? children.filter(Boolean).length : 1,
        preview:
          typeof children === "string"
            ? children.slice(0, 80)
            : Array.isArray(children)
              ? Children.toArray(children).map(describeNode)
              : isValidElement(children)
                ? describeElement(children)
                : String(children),
      }
    );
  }

  return wrapInSpan(children, wrapperProps);
}

/* ----------------------------------------- component ----------------------------------------- */

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    if (asChild) {
      const coercedChild = coerceToSingleElement(children, {
        className: "inline-flex items-center gap-1",
      });

      return (
        <Slot
          ref={ref as React.Ref<HTMLElement>}
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        >
          {coercedChild}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
