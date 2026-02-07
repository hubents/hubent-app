"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SaveAsTemplateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  eventName: string;
  onSaved?: (templateId: number) => void;
}

export function SaveAsTemplateDrawer({
  open,
  onOpenChange,
  eventId,
  eventName,
  onSaved,
}: SaveAsTemplateDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [templateName, setTemplateName] = useState(`Template: ${eventName}`);
  const [description, setDescription] = useState("");

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error("El nombre del template es requerido");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/save-as-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName: templateName.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Template guardado correctamente");
        onOpenChange(false);
        onSaved?.(data.data.id);
      } else {
        toast.error(data.error?.message || "Error al guardar template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Guardar como Template
          </SheetTitle>
          <SheetDescription>
            Convierte &quot;{eventName}&quot; en un template reutilizable para futuros eventos.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="templateName">Nombre del template *</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ej: Boda Completa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe qué incluye este template..."
              rows={3}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Se incluirá:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• Todas las tareas del evento</li>
              <li>• Checklists de cada tarea</li>
              <li>• Contenido HTML/Explicaciones</li>
              <li>• Días relativos a la fecha del evento</li>
            </ul>
          </div>
        </div>

        <SheetFooter className="px-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !templateName.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Guardar Template
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
