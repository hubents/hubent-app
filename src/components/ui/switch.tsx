"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, disabled = false, className, size = "md" }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-7",
      md: "h-5 w-9",
      lg: "h-6 w-11",
    };

    const thumbSizeClasses = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };

    const translateClasses = {
      sm: "translate-x-3",
      md: "translate-x-4",
      lg: "translate-x-5",
    };

    return (
      <button
        ref={ref}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-[var(--primary)]" : "bg-[var(--muted)]",
          sizeClasses[size],
          className
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
            thumbSizeClasses[size],
            checked ? translateClasses[size] : "translate-x-0.5"
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
