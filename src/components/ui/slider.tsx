"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  showValue?: boolean;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ value = 50, onValueChange, min = 0, max = 100, step = 1, disabled = false, className, showValue = false }, ref) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className={cn("relative flex items-center gap-4", className)}>
        <div className="relative flex-1 h-2">
          <div className="absolute inset-0 rounded-full bg-[var(--muted)]" />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--primary)] transition-all duration-150"
            style={{ width: `${percentage}%` }}
          />
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => onValueChange?.(Number(e.target.value))}
            className={cn(
              "absolute inset-0 w-full h-full opacity-0 cursor-pointer",
              disabled && "cursor-not-allowed"
            )}
          />
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-white border-2 border-[var(--primary)] shadow-[var(--shadow-sm)] transition-all duration-150",
              disabled && "opacity-50"
            )}
            style={{ left: `${percentage}%` }}
          />
        </div>
        {showValue && (
          <span className="text-sm font-medium min-w-[3ch] text-right">{value}</span>
        )}
      </div>
    );
  }
);

Slider.displayName = "Slider";

export { Slider };
