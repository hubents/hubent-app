import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hgIcon } from "@/components/ui/hg-icon";
import { ArrowRight01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";

const RiArrowRightLine = hgIcon(ArrowRight01Icon);
const RiCheckboxCircleLine = hgIcon(CheckmarkCircle01Icon);
import { mockTasks } from "@/lib/mock-data";
import Link from "next/link";

const priorityMap = {
  high: { label: "Alta", variant: "destructive" as const },
  medium: { label: "Media", variant: "warning" as const },
  low: { label: "Baja", variant: "secondary" as const },
};

export function PendingTasks() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tareas Pendientes</CardTitle>
        <Link href="/dashboard/tasks">
          <Button variant="ghost" size="sm" className="gap-1">
            Ver todas
            <RiArrowRightLine className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockTasks.slice(0, 5).map((task) => {
            const priority = priorityMap[task.priority as keyof typeof priorityMap];
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 transition-colors hover:bg-[var(--muted)]"
              >
                <button className="text-[var(--muted-foreground)] hover:text-[var(--primary)]">
                  <RiCheckboxCircleLine className="h-5 w-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {task.eventName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={priority.variant} className="text-xs">
                    {priority.label}
                  </Badge>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {new Date(task.dueDate).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
