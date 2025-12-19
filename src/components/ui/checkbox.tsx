"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { RiCheckLine } from "@remixicon/react";

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, disabled = false, className, label }, ref) => {
    return (
      <label className={cn("inline-flex items-center gap-2 cursor-pointer", disabled && "cursor-not-allowed opacity-50")}>
        <button
          ref={ref}
          role="checkbox"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onCheckedChange?.(!checked)}
          className={cn(
            "h-5 w-5 shrink-0 rounded-[var(--radius-sm)] border-2 transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
            checked
              ? "border-[var(--primary)] bg-[var(--primary)]"
              : "border-[var(--border)] bg-transparent hover:border-[var(--ring)]",
            className
          )}
        >
          {checked && (
            <RiCheckLine className="h-4 w-4 text-white animate-in zoom-in-50 duration-200" />
          )}
        </button>
        {label && <span className="text-sm">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
