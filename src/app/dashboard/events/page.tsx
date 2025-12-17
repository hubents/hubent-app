import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  RiAddLine,
  RiCalendarLine,
  RiMapPinLine,
  RiGroupLine,
  RiMoneyDollarCircleLine,
} from "@remixicon/react";
import { mockEvents } from "@/lib/mock-data";

const statusMap = {
  planning: { label: "Planificando", variant: "secondary" as const },
  in_progress: { label: "En progreso", variant: "warning" as const },
  completed: { label: "Completado", variant: "success" as const },
};

export default function EventsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Eventos</h1>
          <p className="text-[var(--muted-foreground)]">
            Gestiona todas tus bodas y eventos
          </p>
        </div>
        <Button className="gap-2">
          <RiAddLine className="h-4 w-4" />
          Nuevo Evento
        </Button>
      </div>

      {/* Events Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mockEvents.map((event) => {
          const status = statusMap[event.status as keyof typeof statusMap];
          const budgetPercentage = Math.round((event.spent / event.budget) * 100);

          return (
            <Link key={event.id} href={`/dashboard/events/${event.id}`}>
              <Card className="h-full transition-all hover:shadow-md hover:border-[var(--primary)]">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{event.name}</h3>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {event.couple}
                        </p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                        <RiCalendarLine className="h-4 w-4" />
                        <span>
                          {new Date(event.date).toLocaleDateString("es-ES", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                        <RiMapPinLine className="h-4 w-4" />
                        <span>{event.venue}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                        <RiGroupLine className="h-4 w-4" />
                        <span>{event.guests} invitados</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--muted-foreground)]">
                          Progreso
                        </span>
                        <span className="font-medium">{event.completion}%</span>
                      </div>
                      <Progress value={event.completion} />
                    </div>

                    {/* Budget */}
                    <div className="flex items-center justify-between rounded-lg bg-[var(--muted)] p-3">
                      <div className="flex items-center gap-2">
                        <RiMoneyDollarCircleLine className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span className="text-sm text-[var(--muted-foreground)]">
                          Presupuesto
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${event.spent.toLocaleString()} / ${event.budget.toLocaleString()}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {budgetPercentage}% utilizado
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
