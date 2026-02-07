"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Event {
  id: number;
  name: string;
  type: string;
  status: string;
  date: string | null;
  endDate?: string | null;
  location: string | null;
  guestCount: number;
  budget: string | null;
  description: string | null;
}

interface EditEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  onEventUpdated?: () => void;
}

const eventTypes = [
  { label: "Boda", value: "wedding" },
  { label: "Pre-Boda", value: "pre_wedding" },
  { label: "Post-Boda", value: "post_wedding" },
  { label: "Cumpleaños", value: "birthday" },
  { label: "Corporativo", value: "corporate" },
  { label: "Social", value: "social" },
  { label: "Otro", value: "other" },
];

const eventStatuses = [
  { label: "Borrador", value: "draft" },
  { label: "Confirmado", value: "confirmed" },
  { label: "En Progreso", value: "in_progress" },
  { label: "Completado", value: "completed" },
  { label: "Cancelado", value: "cancelled" },
];

export function EditEventDialog({ open, onOpenChange, event, onEventUpdated }: EditEventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    status: "",
    date: "",
    endDate: "",
    location: "",
    guestCount: "",
    budget: "",
    description: "",
  });

  useEffect(() => {
    if (event && open) {
      setFormData({
        name: event.name || "",
        type: event.type || "",
        status: event.status || "draft",
        date: event.date ? event.date.split("T")[0] : "",
        endDate: event.endDate ? event.endDate.split("T")[0] : "",
        location: event.location || "",
        guestCount: event.guestCount?.toString() || "",
        budget: event.budget || "",
        description: event.description || "",
      });
      setError(null);
    }
  }, [event, open]);

  const handleSubmit = async () => {
    if (!event) return;
    
    if (!formData.name || !formData.type) {
      setError("Nombre y tipo de evento son obligatorios");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          status: formData.status,
          date: formData.date || null,
          endDate: formData.endDate || null,
          location: formData.location || null,
          guestCount: formData.guestCount ? parseInt(formData.guestCount) : 0,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          description: formData.description || null,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onOpenChange(false);
        onEventUpdated?.();
      } else {
        setError(data.error?.message || "Error al actualizar el evento");
      }
    } catch (err) {
      console.error("Error updating event:", err);
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-[550px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Evento</SheetTitle>
          <SheetDescription>
            Modifica los detalles del evento
          </SheetDescription>
        </SheetHeader>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}
        
        <div className="grid gap-4 px-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del Evento *</label>
              <Input
                placeholder="Ej: Boda García-López"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Evento *</label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                {eventStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de Inicio</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de Finalización</label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.date}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lugar</label>
            <Input
              placeholder="Ej: Hacienda Los Olivos, Mendoza"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Número de Invitados</label>
              <Input
                type="number"
                placeholder="150"
                value={formData.guestCount}
                onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Presupuesto</label>
              <Input
                type="number"
                placeholder="30000"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              placeholder="Detalles adicionales del evento..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
        </div>
        <SheetFooter className="px-4">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !formData.name || !formData.type}
          >
            {loading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
