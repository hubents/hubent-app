"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Copy,
  Loader2,
  ListChecks,
  FileText,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

interface DuplicateEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  eventName: string;
  onDuplicated?: (newEventId: number) => void;
}

interface EventDuplicateStats {
  taskCount: number;
  checklistCount: number;
  taskFormCount: number;
  landingFormCount: number;
}

export function DuplicateEventDrawer({
  open,
  onOpenChange,
  eventId,
  eventName,
  onDuplicated,
}: DuplicateEventDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState(`${eventName} (copia)`);
  const [newDate, setNewDate] = useState("");
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeChecklists, setIncludeChecklists] = useState(true);
  const [includeForms, setIncludeForms] = useState(true);
  const [includeLandingForms, setIncludeLandingForms] = useState(true);
  const [stats, setStats] = useState<EventDuplicateStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/events/${eventId}/duplicate/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch {
      // Stats are non-critical, silently fail
    } finally {
      setLoadingStats(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (open) {
      setNewName(`${eventName} (copia)`);
      setNewDate("");
      setIncludeTasks(true);
      setIncludeChecklists(true);
      setIncludeForms(true);
      setIncludeLandingForms(true);
      setStats(null);
      fetchStats();
    }
  }, [open, eventName, fetchStats]);

  const handleDuplicate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newName: newName.trim(),
          newDate: newDate || undefined,
          includeTasks,
          includeChecklists,
          includeForms,
          includeLandingForms,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Evento duplicado correctamente");
        onOpenChange(false);
        onDuplicated?.(data.data.id);
      } else {
        toast.error(data.error?.message || "Error al duplicar evento");
      }
    } catch (error) {
      console.error("Error duplicating event:", error);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const hasTaskForms = stats ? stats.taskFormCount > 0 : false;
  const hasLandingForms = stats ? stats.landingFormCount > 0 : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicar Evento
          </SheetTitle>
          <SheetDescription>
            Crea una copia de &quot;{eventName}&quot; con todas sus tareas y
            configuración.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="newName">Nombre del nuevo evento</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del evento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newDate">Nueva fecha (opcional)</Label>
            <Input
              id="newDate"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Las fechas de las tareas se ajustarán automáticamente
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Label>Incluir en la copia:</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeTasks"
                checked={includeTasks}
                onCheckedChange={(checked) => setIncludeTasks(checked === true)}
              />
              <Label
                htmlFor="includeTasks"
                className="font-normal cursor-pointer flex items-center gap-1.5"
              >
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                Tareas del evento
                {stats && (
                  <span className="text-xs text-muted-foreground">
                    ({stats.taskCount})
                  </span>
                )}
              </Label>
            </div>

            <div className="flex items-center space-x-2 ml-6">
              <Checkbox
                id="includeChecklists"
                checked={includeChecklists}
                disabled={!includeTasks}
                onCheckedChange={(checked) =>
                  setIncludeChecklists(checked === true)
                }
              />
              <Label
                htmlFor="includeChecklists"
                className={`font-normal cursor-pointer flex items-center gap-1.5 ${!includeTasks ? "text-muted-foreground" : ""}`}
              >
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                Checklists de las tareas
                {stats && stats.checklistCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({stats.checklistCount})
                  </span>
                )}
              </Label>
            </div>

            <div className="flex items-center space-x-2 ml-6">
              <Checkbox
                id="includeForms"
                checked={includeForms}
                disabled={!includeTasks}
                onCheckedChange={(checked) => setIncludeForms(checked === true)}
              />
              <Label
                htmlFor="includeForms"
                className={`font-normal cursor-pointer flex items-center gap-1.5 ${!includeTasks ? "text-muted-foreground" : ""}`}
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                Formularios de las tareas
                {stats && stats.taskFormCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({stats.taskFormCount})
                  </span>
                )}
                {stats && !hasTaskForms && !loadingStats && (
                  <span className="text-xs text-muted-foreground italic">
                    (sin formularios)
                  </span>
                )}
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeLandingForms"
                checked={includeLandingForms}
                onCheckedChange={(checked) =>
                  setIncludeLandingForms(checked === true)
                }
              />
              <Label
                htmlFor="includeLandingForms"
                className="font-normal cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                Formularios del evento
                {stats && stats.landingFormCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({stats.landingFormCount})
                  </span>
                )}
                {stats && !hasLandingForms && !loadingStats && (
                  <span className="text-xs text-muted-foreground italic">
                    (sin formularios)
                  </span>
                )}
              </Label>
            </div>
          </div>
        </div>

        <SheetFooter className="px-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={loading || !newName.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Duplicando...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
