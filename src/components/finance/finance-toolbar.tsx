"use client";

import { RiSearchLine } from "@remixicon/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DirectionOption {
  key: string;
  label: string;
}

export interface StatusTab {
  key: string;
  label: string;
  count?: number;
}

interface FinanceToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit?: () => void;
  searchPlaceholder?: string;

  directions?: DirectionOption[];
  activeDirection?: string;
  onDirectionChange?: (key: string) => void;

  statusTabs?: StatusTab[];
  activeStatus?: string;
  onStatusChange?: (key: string) => void;

  children?: React.ReactNode;
}

export function FinanceToolbar({
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = "Buscar...",
  directions,
  activeDirection,
  onDirectionChange,
  statusTabs,
  activeStatus,
  onStatusChange,
  children,
}: FinanceToolbarProps) {
  return (
    <div className="rounded-lg border bg-card">
      {/* Top row: Search + Direction segment + Action */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearchSubmit?.()}
            className="pl-9 h-9"
          />
        </div>

        {directions && directions.length > 0 && onDirectionChange && (
          <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
            {directions.map((d) => (
              <button
                key={d.key}
                onClick={() => onDirectionChange(d.key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  activeDirection === d.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        {children}
      </div>

      {/* Bottom row: Status underline tabs */}
      {statusTabs && statusTabs.length > 0 && onStatusChange && (
        <div className="flex gap-0 px-4 border-t overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onStatusChange(tab.key)}
              className={cn(
                "px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
                activeStatus === tab.key
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground/70 hover:text-foreground"
              )}
              style={activeStatus === tab.key ? { boxShadow: "inset 0 -2.5px 0 0 var(--foreground)" } : undefined}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-medium rounded-full px-1.5 py-0.5 leading-none",
                    activeStatus === tab.key
                      ? "bg-foreground/10 text-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
