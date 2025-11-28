"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    mds?: {
      MdsPersianDateTimePicker: new (
        triggerElement: HTMLElement,
        options: {
          targetTextSelector: string;
          targetDateSelector?: string;
          persianNumber?: boolean;
          enableTimePicker?: boolean;
          textFormat?: string;
          dateFormat?: string;
        }
      ) => {
        destroy?: () => void;
      };
    };
  }
}

type PersianDatePickerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
};

export function PersianDatePicker({ id, value, onChange }: PersianDatePickerProps) {
  const buttonRef = useRef<HTMLSpanElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pickerInstanceRef = useRef<{ destroy?: () => void } | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pickerInstanceRef.current?.destroy) {
        pickerInstanceRef.current.destroy();
      }
    };
  }, []);

  const handleOpenCalendar = () => {
    if (typeof window === "undefined") return;

    if (!window.mds || !window.mds.MdsPersianDateTimePicker) {
      console.error("window.mds.MdsPersianDateTimePicker is not loaded yet");
      return;
    }

    const trigger = buttonRef.current;
    const input = inputRef.current;

    if (!trigger || !input) return;

    // Only create the picker once
    if (!pickerInstanceRef.current) {
      pickerInstanceRef.current = new window.mds.MdsPersianDateTimePicker(trigger, {
        // This is the input whose value will be updated
        targetTextSelector: `#${id}`,
        targetDateSelector: `#${id}`,
        persianNumber: true,
        enableTimePicker: false,
        textFormat: "yyyy/MM",
        dateFormat: "yyyy/MM",
      });
    }

    // Clicking the trigger opens the calendar (handled by the library)
  };

  return (
    <div className="flex items-center gap-2">
      <span
        ref={buttonRef}
        onClick={handleOpenCalendar}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-input bg-background"
      >
        📅
      </span>
      <input
        id={id}
        ref={inputRef}
        dir="ltr"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
