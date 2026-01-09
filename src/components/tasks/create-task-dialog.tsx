"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactSelector } from "@/components/contacts/contact-selector";

interface Event {
  id: number;
  name: string;
}

interface Contact {
  id: number;
  type: "person" | "company";
  name: string;
  email: string | null;
  avatar: string | null;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated?: () => void;
  preselectedEventId?: number;
}

export function CreateTaskDialog({ open, onOpenChange, onTaskCreated, preselectedEventId }: CreateTaskDialogProps) {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    eventId: preselectedEventId?.toString() || "",
  });

  // Actualizar eventId cuando cambia preselectedEventId
  useEffect(() => {
    if (preselectedEventId) {
      setFormData(prev => ({ ...prev, eventId: preselectedEventId.toString() }));
    }
  }, [preselectedEventId]);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          setEvents(data.data || []);
        }
      } catch (error) {
        console.error("Error loading events:", error);
      }
    }
    // Solo cargar eventos si no hay uno preseleccionado
    if (open && !preselectedEventId) {
      loadEvents();
    }
  }, [open, preselectedEventId]);

  const handleSubmit = async () => {
    if (!formData.title || !formData.eventId) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
          eventId: parseInt(formData.eventId),
        }),
      });

      if (res.ok) {
        setFormData({
          title: "",
          description: "",
          priority: "medium",
          dueDate: "",
          eventId: preselectedEventId?.toString() || "",
        });
        setSelectedContacts([]);
        onOpenChange(false);
        onTaskCreated?.();
      }
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nueva Tarea</DialogTitle>
          <DialogDescription>
            Crea una nueva tarea para tu equipo
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Solo mostrar selector de evento si no hay uno preseleccionado */}
          {!preselectedEventId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Evento *</label>
              <Select
                value={formData.eventId}
                onValueChange={(value) => setFormData({ ...formData, eventId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.length === 0 ? (
                    <SelectItem value="__no_events__" disabled>No hay eventos - crea uno primero</SelectItem>
                  ) : (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id.toString()}>
                        {event.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Título *</label>
            <Input
              placeholder="Ej: Confirmar menú con catering"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              placeholder="Detalles de la tarea..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridad</label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha límite</label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Contactos relacionados</label>
            <ContactSelector
              selectedContacts={selectedContacts}
              onSelect={(contact) => setSelectedContacts([...selectedContacts, contact])}
              onRemove={(contactId) => setSelectedContacts(selectedContacts.filter(c => c.id !== contactId))}
              placeholder="Vincular contacto..."
              multiple
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !formData.title || !formData.eventId}
          >
            {loading ? "Creando..." : "Crear Tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
