import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => {
  return (
    <span className="relative inline-flex items-center">
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-sm border border-input bg-background shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      <Check
        className="pointer-events-none absolute inset-0 m-auto h-3 w-3 text-primary opacity-0 transition peer-checked:opacity-100"
        strokeWidth={3}
      />
    </span>
  );
});
Checkbox.displayName = "Checkbox";

export { Checkbox };
