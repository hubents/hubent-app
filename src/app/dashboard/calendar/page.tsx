import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiAddLine,
} from "@remixicon/react";

const events = [
  { id: "1", title: "Boda García-López", date: "2025-01-15", type: "wedding", color: "bg-blue-500" },
  { id: "2", title: "Reunión Catering", date: "2025-01-18", type: "meeting", color: "bg-purple-500" },
  { id: "3", title: "Prueba de menú", date: "2025-01-20", type: "task", color: "bg-green-500" },
  { id: "4", title: "Boda Martínez-Ruiz", date: "2025-01-22", type: "wedding", color: "bg-blue-500" },
  { id: "5", title: "Pago Fotógrafo", date: "2025-01-25", type: "payment", color: "bg-red-500" },
  { id: "6", title: "Degustación pastel", date: "2025-01-28", type: "task", color: "bg-green-500" },
];

const upcomingEvents = [
  { id: "1", title: "Boda García-López", date: "2025-01-15", time: "16:00", venue: "Hacienda Los Olivos" },
  { id: "2", title: "Reunión con florista", date: "2025-01-18", time: "10:00", venue: "Oficina" },
  { id: "3", title: "Prueba de menú", date: "2025-01-20", time: "13:00", venue: "Catering Deluxe" },
  { id: "4", title: "Boda Martínez-Ruiz", date: "2025-01-22", time: "18:00", venue: "Hotel Grand Palace" },
];

const daysOfWeek = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function generateCalendarDays() {
  const days = [];
  for (let i = 1; i <= 31; i++) {
    const dayEvents = events.filter((e) => {
      const eventDay = new Date(e.date).getDate();
      return eventDay === i;
    });
    days.push({ day: i, events: dayEvents });
  }
  return days;
}

export default function CalendarPage() {
  const calendarDays = generateCalendarDays();

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
        <Button className="gap-2">
          <RiAddLine className="h-4 w-4" />
          Nuevo Evento
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Enero 2025</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <RiArrowLeftSLine className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                Hoy
              </Button>
              <Button variant="outline" size="icon">
                <RiArrowRightSLine className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-[var(--muted-foreground)] py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts (Wednesday) */}
              {[...Array(2)].map((_, i) => (
                <div key={`empty-${i}`} className="h-24 p-1" />
              ))}

              {calendarDays.map(({ day, events: dayEvents }) => (
                <div
                  key={day}
                  className={`h-24 p-1 border border-[var(--border)] rounded-md hover:bg-[var(--muted)] cursor-pointer transition-colors ${
                    day === 17 ? "bg-[var(--primary)]/10 border-[var(--primary)]" : ""
                  }`}
                >
                  <span
                    className={`text-sm ${
                      day === 17
                        ? "font-bold text-[var(--primary)]"
                        : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className={`${event.color} text-white text-xs px-1 py-0.5 rounded truncate`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        +{dayEvents.length - 2} más
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-blue-500" />
                <span className="text-xs text-[var(--muted-foreground)]">Bodas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-purple-500" />
                <span className="text-xs text-[var(--muted-foreground)]">Reuniones</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-green-500" />
                <span className="text-xs text-[var(--muted-foreground)]">Tareas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-red-500" />
                <span className="text-xs text-[var(--muted-foreground)]">Pagos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex gap-4 p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] cursor-pointer transition-colors"
                >
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--primary)]">
                      {new Date(event.date).getDate()}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {new Date(event.date).toLocaleDateString("es-ES", {
                        month: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {event.time} • {event.venue}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
