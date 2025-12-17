"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { RiArrowDownSLine } from "@remixicon/react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ value, onValueChange, options, placeholder = "Seleccionar...", disabled = false, className }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const selectRef = React.useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <div ref={selectRef} className={cn("relative", className)}>
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-[var(--radius)] border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isOpen && "ring-2 ring-[var(--primary)]"
          )}
        >
          <span className={cn(!selectedOption && "text-[var(--muted-foreground)]")}>
            {selectedOption?.label || placeholder}
          </span>
          <RiArrowDownSLine
            className={cn(
              "h-4 w-4 text-[var(--muted-foreground)] transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg animate-in fade-in-0 zoom-in-95 duration-200">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onValueChange?.(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)]",
                  value === option.value && "bg-[var(--primary)]/10 text-[var(--primary)] font-medium"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
