"use client";

import { cn } from "@/lib/utils";
import {
  RiStackLine,
  RiCalendarEventLine,
  RiListCheck3,
} from "@remixicon/react";

export type ScopeValue = "standalone" | "event" | "all";

interface ScopeFilterProps {
  value: ScopeValue;
  onChange: (value: ScopeValue) => void;
  className?: string;
}

const options: { key: ScopeValue; label: string; icon: typeof RiStackLine }[] =
  [
    { key: "standalone", label: "Independientes", icon: RiListCheck3 },
    { key: "event", label: "De eventos", icon: RiCalendarEventLine },
    { key: "all", label: "Todos", icon: RiStackLine },
  ];

export function ScopeFilter({ value, onChange, className }: ScopeFilterProps) {
  return (
    <div
      className={cn(
        "flex items-center bg-muted rounded-lg p-0.5 gap-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            type="button"
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
              value === opt.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
