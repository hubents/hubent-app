"use client";

import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/lib/calendar";
import { getCalendarWeeks, getDateKey, isToday } from "@/lib/calendar";
import { CalendarEventChip } from "./calendar-event-chip";
import { CalendarDayPopover } from "./calendar-day-popover";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarViewProps {
  month: number;
  year: number;
  itemsByDate: Map<string, CalendarItem[]>;
  loading?: boolean;
  compact?: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onNavigate?: () => void;
}

const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function CalendarView({
  month,
  year,
  itemsByDate,
  loading,
  compact,
  onPrevMonth,
  onNextMonth,
  onToday,
  onNavigate,
}: CalendarViewProps) {
  const weeks = getCalendarWeeks(year, month);
  const maxChips = compact ? 2 : 3;

  if (loading) {
    return <CalendarSkeleton compact={compact} />;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn("font-semibold", compact ? "text-base" : "text-lg")}>
            {MONTH_NAMES[month - 1]} {year}
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={onPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={onToday}>
              Hoy
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={onNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className={cn(
                "text-center font-medium text-[var(--muted-foreground)]",
                compact ? "text-[10px] py-1" : "text-xs py-2"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
          {weeks.map((week, wi) =>
            week.map((date, di) => {
              const dateKey = getDateKey(date);
              const dayItems = itemsByDate.get(dateKey) || [];
              const isCurrentMonth = date.getMonth() === month - 1;
              const todayFlag = isToday(date);
              const visibleItems = dayItems.slice(0, maxChips);
              const moreCount = dayItems.length - maxChips;

              const cellContent = (
                <div
                  className={cn(
                    "bg-[var(--card)] transition-colors cursor-pointer",
                    compact ? "min-h-[52px] p-1" : "min-h-[80px] p-1.5",
                    !isCurrentMonth && "opacity-40",
                    todayFlag && "bg-[var(--primary)]/5",
                    dayItems.length > 0 && "hover:bg-[var(--muted)]"
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded-full",
                        compact ? "text-[10px] w-5 h-5" : "text-xs w-6 h-6",
                        todayFlag
                          ? "bg-[var(--primary)] text-white font-bold"
                          : isCurrentMonth
                          ? "text-[var(--foreground)]"
                          : "text-[var(--muted-foreground)]"
                      )}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Event chips */}
                  <div className={cn("space-y-0.5", compact && "flex gap-0.5 flex-wrap")}>
                    {compact
                      ? dayItems.slice(0, 4).map((item) => (
                          <CalendarEventChip
                            key={item.id}
                            item={item}
                            compact
                            onNavigate={onNavigate}
                          />
                        ))
                      : visibleItems.map((item) => (
                          <CalendarEventChip
                            key={item.id}
                            item={item}
                            onNavigate={onNavigate}
                          />
                        ))}
                    {!compact && moreCount > 0 && (
                      <span className="text-[10px] text-[var(--muted-foreground)] px-1">
                        +{moreCount} más
                      </span>
                    )}
                    {compact && dayItems.length > 4 && (
                      <span className="text-[9px] text-[var(--muted-foreground)]">
                        +{dayItems.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              );

              if (dayItems.length > 0) {
                return (
                  <CalendarDayPopover
                    key={`${wi}-${di}`}
                    date={date}
                    items={dayItems}
                    onNavigate={onNavigate}
                  >
                    {cellContent}
                  </CalendarDayPopover>
                );
              }

              return (
                <div key={`${wi}-${di}`}>
                  {cellContent}
                </div>
              );
            })
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function CalendarSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className={cn("h-6", compact ? "w-28" : "w-36")} />
        <div className="flex gap-1">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-7 w-7" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("rounded-none", compact ? "h-[52px]" : "h-[80px]")}
          />
        ))}
      </div>
    </div>
  );
}
