"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DuplicateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  eventName: string;
  onDuplicated?: (newEventId: number) => void;
}

export function DuplicateEventDialog({
  open,
  onOpenChange,
  eventId,
  eventName,
  onDuplicated,
}: DuplicateEventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState(`${eventName} (copia)`);
  const [newDate, setNewDate] = useState("");
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeChecklists, setIncludeChecklists] = useState(true);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicar Evento
          </DialogTitle>
          <DialogDescription>
            Crea una copia de &quot;{eventName}&quot; con todas sus tareas y configuración.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              <Label htmlFor="includeTasks" className="font-normal cursor-pointer">
                Tareas del evento
              </Label>
            </div>

            <div className="flex items-center space-x-2 ml-6">
              <Checkbox
                id="includeChecklists"
                checked={includeChecklists}
                disabled={!includeTasks}
                onCheckedChange={(checked) => setIncludeChecklists(checked === true)}
              />
              <Label 
                htmlFor="includeChecklists" 
                className={`font-normal cursor-pointer ${!includeTasks ? "text-muted-foreground" : ""}`}
              >
                Checklists de las tareas
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDuplicate} disabled={loading || !newName.trim()}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
