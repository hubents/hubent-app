"use client";

import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/lib/calendar";
import {
  CALENDAR_COLORS,
  CALENDAR_LABELS,
  CALENDAR_ICONS,
} from "@/lib/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";

interface CalendarDayPopoverProps {
  date: Date;
  items: CalendarItem[];
  children: React.ReactNode;
  onNavigate?: () => void;
}

export function CalendarDayPopover({
  date,
  items,
  children,
  onNavigate,
}: CalendarDayPopoverProps) {
  const router = useRouter();

  if (items.length === 0) {
    return <>{children}</>;
  }

  const handleItemClick = (item: CalendarItem) => {
    onNavigate?.();
    router.push(item.href);
  };

  const dateLabel = date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        side="right"
        align="start"
        sideOffset={4}
      >
        <div className="px-3 py-2 border-b border-[var(--border)]">
          <p className="text-sm font-medium capitalize">{dateLabel}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {items.length} {items.length === 1 ? "elemento" : "elementos"}
          </p>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {items.map((item) => {
            const Icon = CALENDAR_ICONS[item.type];
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-[var(--muted)] transition-colors"
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    CALENDAR_COLORS[item.type]
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
                    {item.time && <span>{item.time}</span>}
                    <span className="flex items-center gap-0.5">
                      <Icon className="w-3 h-3" />
                      {CALENDAR_LABELS[item.type]}
                    </span>
                    {item.meta?.status && (
                      <span className="capitalize">• {item.meta.status}</span>
                    )}
                  </div>
                  {item.meta?.amount && (
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      {(item.meta.currency === "EUR" ? "€" : item.meta.currency || "€")}{" "}
                      {item.meta.amount.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
