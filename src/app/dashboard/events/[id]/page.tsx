import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  RiArrowLeftLine,
  RiCalendarLine,
  RiMapPinLine,
  RiGroupLine,
  RiMoneyDollarCircleLine,
  RiFileListLine,
  RiStore2Line,
  RiFileTextLine,
  RiEditLine,
} from "@remixicon/react";
import Link from "next/link";
import { mockEvents, mockTasks, mockVendors } from "@/lib/mock-data";

const statusMap = {
  planning: { label: "Planificando", variant: "secondary" as const },
  in_progress: { label: "En progreso", variant: "warning" as const },
  completed: { label: "Completado", variant: "success" as const },
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = mockEvents.find((e) => e.id === id) || mockEvents[0];
  const status = statusMap[event.status as keyof typeof statusMap];
  const eventTasks = mockTasks.filter((t) => t.eventId === event.id);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/dashboard/events">
        <Button variant="ghost" className="gap-2">
          <RiArrowLeftLine className="h-4 w-4" />
          Volver a eventos
        </Button>
      </Link>

      {/* Event Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-lg text-[var(--muted-foreground)]">{event.couple}</p>
        </div>
        <Button className="gap-2">
          <RiEditLine className="h-4 w-4" />
          Editar Evento
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-[var(--primary)]/10 p-3">
              <RiCalendarLine className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Fecha</p>
              <p className="font-semibold">
                {new Date(event.date).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-[var(--success)]/10 p-3">
              <RiMapPinLine className="h-5 w-5 text-[var(--success)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Lugar</p>
              <p className="font-semibold">{event.venue}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-[var(--warning)]/10 p-3">
              <RiGroupLine className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Invitados</p>
              <p className="font-semibold">{event.guests} personas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-[var(--accent)]/10 p-3">
              <RiMoneyDollarCircleLine className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Presupuesto</p>
              <p className="font-semibold">${event.budget.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted-foreground)]">
              Completado: {event.completion}%
            </span>
            <span className="text-[var(--muted-foreground)]">
              Gastado: ${event.spent.toLocaleString()} de ${event.budget.toLocaleString()}
            </span>
          </div>
          <Progress value={event.completion} className="h-3" />
        </CardContent>
      </Card>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiFileListLine className="h-5 w-5" />
              Tareas
            </CardTitle>
            <Button variant="outline" size="sm">
              Ver todas
            </Button>
          </CardHeader>
          <CardContent>
            {eventTasks.length > 0 ? (
              <div className="space-y-3">
                {eventTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3"
                  >
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Vence:{" "}
                        {new Date(task.dueDate).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        task.priority === "high"
                          ? "destructive"
                          : task.priority === "medium"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {task.priority === "high"
                        ? "Alta"
                        : task.priority === "medium"
                        ? "Media"
                        : "Baja"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[var(--muted-foreground)] py-8">
                No hay tareas asignadas
              </p>
            )}
          </CardContent>
        </Card>

        {/* Vendors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiStore2Line className="h-5 w-5" />
              Proveedores
            </CardTitle>
            <Button variant="outline" size="sm">
              Agregar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockVendors.slice(0, 3).map((vendor) => (
                <div
                  key={vendor.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3"
                >
                  <div>
                    <p className="font-medium">{vendor.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {vendor.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--warning)]">
                    <span className="text-sm font-medium">★ {vendor.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiFileTextLine className="h-5 w-5" />
              Documentos
            </CardTitle>
            <Button variant="outline" size="sm">
              Subir
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
                <div className="rounded-lg bg-red-50 p-2">
                  <RiFileTextLine className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Contrato-Catering.pdf</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    2.4 MB • Subido hace 3 días
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
                <div className="rounded-lg bg-blue-50 p-2">
                  <RiFileTextLine className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Presupuesto-Final.xlsx</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    156 KB • Subido hace 1 semana
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiCalendarLine className="h-5 w-5" />
              Cronograma
            </CardTitle>
            <Button variant="outline" size="sm">
              Ver completo
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-[var(--success)]" />
                  <div className="h-full w-0.5 bg-[var(--border)]" />
                </div>
                <div className="pb-4">
                  <p className="font-medium">Reserva del lugar</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Completado • 15 Dic 2024
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-[var(--success)]" />
                  <div className="h-full w-0.5 bg-[var(--border)]" />
                </div>
                <div className="pb-4">
                  <p className="font-medium">Contratación catering</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Completado • 20 Dic 2024
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-[var(--warning)]" />
                  <div className="h-full w-0.5 bg-[var(--border)]" />
                </div>
                <div className="pb-4">
                  <p className="font-medium">Envío de invitaciones</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    En progreso • Vence 15 Ene 2025
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full border-2 border-[var(--border)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--muted-foreground)]">
                    Prueba de menú
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Pendiente • 1 Feb 2025
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
