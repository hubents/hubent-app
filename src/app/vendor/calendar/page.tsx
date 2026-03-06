"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarView } from "@/components/calendar/calendar-view";
import { CalendarFilters } from "@/components/calendar/calendar-filters";
import { CalendarUpcoming } from "@/components/calendar/calendar-upcoming";
import { useCalendar } from "@/hooks/use-calendar";
import { CALENDAR_COLORS, CALENDAR_LABELS } from "@/lib/calendar";
import { RiCalendar2Line } from "@remixicon/react";

export default function VendorCalendarPage() {
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
  } = useCalendar({ visibleTypes: ["event", "task"], filterKey: "hubents-calendar-filters-vendor" });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Calendario</h1>
        <p className="text-muted-foreground">
          Eventos, tareas y pagos de tus eventos asignados
        </p>
      </div>

      {!loading && filteredItems.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <RiCalendar2Line className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Sin eventos en el calendario</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cuando un planificador te asigne a un evento, sus actividades aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      )}

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
                  <span className="text-xs text-muted-foreground">
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
            <CardTitle>Próximos</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarUpcoming items={filteredItems} month={month} year={year} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
