"use client";

import { cn } from "@/lib/utils";
import type { CalendarItemType } from "@/lib/calendar";
import {
  CALENDAR_COLORS,
  CALENDAR_LABELS,
  CALENDAR_ICONS,
} from "@/lib/calendar";

interface CalendarFiltersProps {
  filters: Record<CalendarItemType, boolean>;
  onToggle: (type: CalendarItemType) => void;
  allowedTypes?: CalendarItemType[];
}

const ALL_TYPES: CalendarItemType[] = [
  "event",
  "task",
  "meeting",
  "payment",
  "task_payment",
  "document",
  "lead",
  "schedule",
];

export function CalendarFilters({ filters, onToggle, allowedTypes }: CalendarFiltersProps) {
  const visibleTypes = allowedTypes ?? ALL_TYPES;
  return (
    <div className="flex flex-wrap gap-2">
      {visibleTypes.map((type) => {
        const Icon = CALENDAR_ICONS[type];
        const active = filters[type];

        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border",
              active
                ? cn("border-transparent text-white shadow-sm", CALENDAR_COLORS[type])
                : "border-[var(--border)] text-[var(--muted-foreground)] bg-transparent opacity-50 hover:opacity-75"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{CALENDAR_LABELS[type]}</span>
          </button>
        );
      })}
    </div>
  );
}
