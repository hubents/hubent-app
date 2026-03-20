"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CalendarView } from "./calendar-view";
import { CalendarFilters } from "./calendar-filters";
import { CalendarUpcoming } from "./calendar-upcoming";
import { useCalendar } from "@/hooks/use-calendar";
import { CalendarDays, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserSessionContext } from "@/contexts/user-session-context";

interface CalendarDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarDrawer({ open, onOpenChange }: CalendarDrawerProps) {
  const router = useRouter();
  const { orgType } = useUserSessionContext();
  const {
    month,
    year,
    filteredItems,
    filteredItemsByDate,
    loading,
    filters,
    allowedTypes,
    toggleFilter,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
  } = useCalendar({
    visibleTypes: orgType === "provider"
      ? ["event", "task", "meeting", "payment", "task_payment", "document", "schedule"]
      : ["event", "task", "meeting", "payment", "task_payment", "document", "lead", "schedule"],
    filterKey: "hubents-calendar-filters-general",
  });

  const handleNavigate = () => {
    onOpenChange(false);
  };

  const handleOpenFullPage = () => {
    onOpenChange(false);
    router.push(orgType === "provider" ? "/vendor/calendar" : "/dashboard/calendar");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <div>
                <SheetTitle className="text-left">Calendario</SheetTitle>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Eventos, tareas y pagos programados
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5"
              onClick={handleOpenFullPage}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver completo
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-6">
            {/* Calendar View */}
            <CalendarView
              month={month}
              year={year}
              itemsByDate={filteredItemsByDate}
              loading={loading}
              compact
              onPrevMonth={goToPrevMonth}
              onNextMonth={goToNextMonth}
              onToday={goToToday}
              onNavigate={handleNavigate}
            />

            {/* Filters */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
                Filtros
              </h4>
              <CalendarFilters filters={filters} onToggle={toggleFilter} allowedTypes={allowedTypes} />
            </div>

            {/* Upcoming */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
                Próximos eventos
              </h4>
              <CalendarUpcoming
                items={filteredItems}
                onNavigate={handleNavigate}
              />
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
