"use client";

import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/lib/calendar";
import {
  CALENDAR_COLORS,
  CALENDAR_ICONS,
  CALENDAR_LABELS,
  getDateKey,
  formatRelativeDay,
} from "@/lib/calendar";
import { useRouter } from "next/navigation";

interface CalendarUpcomingProps {
  items: CalendarItem[];
  onNavigate?: () => void;
}

export function CalendarUpcoming({
  items,
  onNavigate,
}: CalendarUpcomingProps) {
  const router = useRouter();

  const upcoming = [...items].sort((a, b) => a.date.localeCompare(b.date));

  // Group by date key
  const grouped = new Map<string, CalendarItem[]>();
  for (const item of upcoming) {
    const key = getDateKey(item.date);
    const list = grouped.get(key) || [];
    list.push(item);
    grouped.set(key, list);
  }

  const handleClick = (item: CalendarItem) => {
    onNavigate?.();
    router.push(item.href);
  };

  if (upcoming.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          No hay eventos próximos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([dateKey, dayItems]) => (
        <div key={dateKey}>
          <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
            {formatRelativeDay(dateKey)}
          </h4>
          <div className="space-y-1">
            {dayItems.map((item) => {
              const Icon = CALENDAR_ICONS[item.type];
              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[var(--muted)] transition-colors group"
                >
                  <div className="flex flex-col items-center justify-center w-10">
                    {item.time ? (
                      <span className="text-xs font-medium text-[var(--foreground)]">
                        {item.time}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        --:--
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "w-1 h-8 rounded-full shrink-0",
                      CALENDAR_COLORS[item.type]
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-[var(--primary)] transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
                      <Icon className="w-3 h-3" />
                      <span>{CALENDAR_LABELS[item.type]}</span>
                      {item.meta?.location && (
                        <span>• {item.meta.location}</span>
                      )}
                      {item.meta?.amount && (
                        <span>
                          • {(item.meta.currency === "EUR" ? "€" : item.meta.currency || "€")}{" "}
                          {item.meta.amount.toLocaleString("es-ES")}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
