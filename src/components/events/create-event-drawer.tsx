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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ContactSelector } from "@/components/contacts/contact-selector";
import { TemplateSelector } from "@/components/events/template-selector";
import { Sparkles } from "lucide-react";

interface Contact {
  id: number;
  type: "person" | "company";
  name: string;
  email: string | null;
  avatar: string | null;
}

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated?: () => void;
}

// Map display names to database values
const eventTypes = [
  { label: "Boda", value: "wedding" },
  { label: "Pre-Boda", value: "pre_wedding" },
  { label: "Post-Boda", value: "post_wedding" },
  { label: "Cumpleaños", value: "birthday" },
  { label: "Corporativo", value: "corporate" },
  { label: "Social", value: "social" },
  { label: "Otro", value: "other" },
];

export function CreateEventDialog({ open, onOpenChange, onEventCreated }: CreateEventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    eventType: "",
    date: "",
    endDate: "",
    venue: "",
    guestCount: "",
    budget: "",
    description: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      eventType: "",
      date: "",
      endDate: "",
      venue: "",
      guestCount: "",
      budget: "",
      description: "",
    });
    setSelectedContact(null);
    setSelectedTemplateId(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.eventType) {
      setError("Nombre y tipo de evento son obligatorios");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.eventType,
          date: formData.date ? new Date(formData.date).toISOString() : undefined,
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
          location: formData.venue || undefined,
          guestCount: formData.guestCount ? parseInt(formData.guestCount) : undefined,
          budget: formData.budget ? parseFloat(formData.budget) : undefined,
          description: formData.description || undefined,
          templateId: selectedTemplateId || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Si hay contacto seleccionado, vincularlo al evento
        if (selectedContact && data.data?.id) {
          try {
            await fetch(`/api/events/${data.data.id}/contacts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contactId: selectedContact.id, role: "client" }),
            });
          } catch (linkError) {
            console.error("Error linking contact to event:", linkError);
          }
        }
        resetForm();
        onOpenChange(false);
        onEventCreated?.();
      } else {
        setError(data.error?.message || "Error al crear el evento");
      }
    } catch (err) {
      console.error("Error creating event:", err);
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo Evento</SheetTitle>
          <SheetDescription>
            Crea un nuevo evento para comenzar a planificar
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
                value={formData.eventType}
                onValueChange={(value) => setFormData({ ...formData, eventType: value })}
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

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="template" className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Usar Template</span>
                  {selectedTemplateId && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Template seleccionado
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Selecciona un template para pre-cargar tareas y checklists
                </p>
                <TemplateSelector
                  selectedTemplateId={selectedTemplateId}
                  onSelect={setSelectedTemplateId}
                  eventType={formData.eventType || undefined}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
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
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Cliente (Contacto)</label>
            <ContactSelector
              selectedContacts={selectedContact ? [selectedContact] : []}
              onSelect={(contact) => setSelectedContact(contact)}
              onRemove={() => setSelectedContact(null)}
              placeholder="Buscar cliente..."
              multiple={false}
            />
            <p className="text-xs text-muted-foreground">
              Vincula un contacto como cliente de este evento
            </p>
          </div>
        </div>
        <SheetFooter className="px-4">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !formData.name || !formData.eventType}
          >
            {loading ? "Creando..." : "Crear Evento"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
