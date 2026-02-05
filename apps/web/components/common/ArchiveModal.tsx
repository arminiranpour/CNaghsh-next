"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";

type ArchiveModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function ArchiveModal({
  open,
  onOpenChange,
  title,
  children,
  className,
  bodyClassName,
}: ArchiveModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          dir="rtl"
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[min(900px,95vw)] -translate-x-1/2 -translate-y-1/2",
            "max-h-[80vh] rounded-[20px] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.20)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            className,
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <DialogPrimitive.Title className="text-right text-xl font-bold text-black">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-lg text-[#4B4B4B] transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="بستن"
            >
              ×
            </DialogPrimitive.Close>
          </div>
          <div className={cn("mt-4", bodyClassName)}>{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
