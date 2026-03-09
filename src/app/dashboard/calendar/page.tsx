"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiAddLine } from "@remixicon/react";
import { CalendarView } from "@/components/calendar/calendar-view";
import { CalendarFilters } from "@/components/calendar/calendar-filters";
import { CalendarUpcoming } from "@/components/calendar/calendar-upcoming";
import { useCalendar } from "@/hooks/use-calendar";
import { CALENDAR_COLORS, CALENDAR_LABELS } from "@/lib/calendar";
import { useRouter } from "next/navigation";

export default function CalendarPage() {
  const router = useRouter();
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
  } = useCalendar({ visibleTypes: ["event", "task", "meeting", "payment", "task_payment", "document", "lead"], filterKey: "hubents-calendar-filters-general" });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendario</h1>
          <p className="text-[var(--muted-foreground)]">
            Vista general de eventos y tareas programadas
          </p>
        </div>
        <Button className="gap-2" onClick={() => router.push("/dashboard/events")}>
          <RiAddLine className="h-4 w-4" />
          Nuevo Evento
        </Button>
      </div>

      {/* Filters */}
      <CalendarFilters filters={filters} onToggle={toggleFilter} allowedTypes={allowedTypes} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <CalendarView
              month={month}
              year={year}
              itemsByDate={filteredItemsByDate}
              loading={loading}
              onPrevMonth={goToPrevMonth}
              onNextMonth={goToNextMonth}
              onToday={goToToday}
            />

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4">
              {allowedTypes.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded ${CALENDAR_COLORS[type]}`} />
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {CALENDAR_LABELS[type]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarUpcoming items={filteredItems} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
