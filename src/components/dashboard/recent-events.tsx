import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { hgIcon } from "@/components/ui/hg-icon";
import { ArrowRight01Icon, Calendar01Icon } from "@hugeicons/core-free-icons";

const RiArrowRightLine = hgIcon(ArrowRight01Icon);
const RiCalendarLine = hgIcon(Calendar01Icon);
import { mockEvents } from "@/lib/mock-data";

const statusMap = {
  planning: { label: "Planificando", variant: "secondary" as const },
  in_progress: { label: "En progreso", variant: "warning" as const },
  completed: { label: "Completado", variant: "success" as const },
};

export function RecentEvents() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Eventos Recientes</CardTitle>
        <Link href="/dashboard/events">
          <Button variant="ghost" size="sm" className="gap-1">
            Ver todos
            <RiArrowRightLine className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockEvents.slice(0, 4).map((event) => {
            const status = statusMap[event.status as keyof typeof statusMap];
            return (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}`}
                className="block"
              >
                <div className="flex items-center gap-4 rounded-lg border border-[var(--border)] p-4 transition-colors hover:bg-[var(--muted)]">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{event.name}</h4>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {event.couple}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                      <span className="flex items-center gap-1">
                        <RiCalendarLine className="h-3.5 w-3.5" />
                        {new Date(event.date).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span>{event.guests} invitados</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={event.completion} className="flex-1" />
                      <span className="text-xs font-medium">
                        {event.completion}%
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
