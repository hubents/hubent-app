"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: RadioOption[];
  disabled?: boolean;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ value, onValueChange, options, disabled = false, className, orientation = "vertical" }, ref) => {
    return (
      <div
        ref={ref}
        role="radiogroup"
        className={cn(
          "flex gap-3",
          orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
          className
        )}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "inline-flex items-center gap-2 cursor-pointer",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <button
              role="radio"
              aria-checked={value === option.value}
              disabled={disabled}
              onClick={() => onValueChange?.(option.value)}
              className={cn(
                "h-5 w-5 shrink-0 rounded-full border-2 transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 flex items-center justify-center",
                value === option.value
                  ? "border-[var(--primary)]"
                  : "border-[var(--border)] hover:border-[var(--ring)]"
              )}
            >
              {value === option.value && (
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)] animate-in zoom-in-50 duration-200" />
              )}
            </button>
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
    );
  }
);

RadioGroup.displayName = "RadioGroup";

export { RadioGroup };
