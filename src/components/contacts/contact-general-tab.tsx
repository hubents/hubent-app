"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiMailLine,
  RiPhoneLine,
  RiCalendarLine,
  RiGroupLine,
  RiMoneyDollarCircleLine,
  RiBuilding2Line,
  RiLinksLine,
  RiSaveLine,
} from "@remixicon/react";

interface ContactDetail {
  id: number;
  type: "person" | "company";
  name: string;
  email: string | null;
  phone: string | null;
  phoneCountryCode: string | null;
  firstName: string | null;
  lastName: string | null;
  passportId: string | null;
  nieOrCif: string | null;
  tradeName: string | null;
  taxId: string | null;
  website: string | null;
  contactPersonName: string | null;
  contactPersonEmail: string | null;
  eventDate: string | null;
  guestCount: number | null;
  budget: string | null;
  venueType: string | null;
  tags: string[] | null;
  source: string | null;
  isLead: boolean | null;
  leadScore: number | null;
  notes: string | null;
}

interface LinkedEvent {
  id: number;
  eventId: number;
  role: string | null;
  eventName: string;
  eventDate: string | null;
  eventStatus: string | null;
}

interface LinkedTask {
  id: number;
  taskId: number;
  role: string | null;
  taskTitle: string;
  taskStatus: string | null;
  taskDueDate: string | null;
}

interface ContactGeneralTabProps {
  contact: ContactDetail | null;
  loading: boolean;
  onUpdateContact: (updates: Record<string, unknown>) => Promise<unknown>;
  linkedEvents: LinkedEvent[];
  linkedTasks: LinkedTask[];
}

export function ContactGeneralTab({
  contact,
  loading,
  onUpdateContact,
  linkedEvents,
  linkedTasks,
}: ContactGeneralTabProps) {
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    phoneCountryCode: "+34",
    firstName: "",
    lastName: "",
    nieOrCif: "",
    tradeName: "",
    taxId: "",
    website: "",
    contactPersonName: "",
    contactPersonEmail: "",
    eventDate: "",
    guestCount: "",
    budget: "",
    venueType: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        email: contact.email || "",
        phone: contact.phone || "",
        phoneCountryCode: contact.phoneCountryCode || "+34",
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        nieOrCif: contact.nieOrCif || "",
        tradeName: contact.tradeName || "",
        taxId: contact.taxId || "",
        website: contact.website || "",
        contactPersonName: contact.contactPersonName || "",
        contactPersonEmail: contact.contactPersonEmail || "",
        eventDate: contact.eventDate ? contact.eventDate.split("T")[0] : "",
        guestCount: contact.guestCount?.toString() || "",
        budget: contact.budget || "",
        venueType: contact.venueType || "",
        notes: contact.notes || "",
      });
      setHasChanges(false);
    }
  }, [contact]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        email: formData.email || null,
        phone: formData.phone || null,
        phoneCountryCode: formData.phoneCountryCode,
        notes: formData.notes || null,
      };

      if (contact?.type === "person") {
        updates.firstName = formData.firstName || null;
        updates.lastName = formData.lastName || null;
        updates.nieOrCif = formData.nieOrCif || null;
        if (formData.firstName || formData.lastName) {
          updates.name = `${formData.firstName} ${formData.lastName}`.trim();
        }
      } else {
        updates.tradeName = formData.tradeName || null;
        updates.taxId = formData.taxId || null;
        updates.website = formData.website || null;
        updates.contactPersonName = formData.contactPersonName || null;
        updates.contactPersonEmail = formData.contactPersonEmail || null;
      }

      // Event fields
      if (formData.eventDate) {
        updates.eventDate = formData.eventDate;
      }
      if (formData.guestCount) {
        updates.guestCount = parseInt(formData.guestCount, 10);
      }
      if (formData.budget) {
        updates.budget = parseFloat(formData.budget);
      }
      if (formData.venueType) {
        updates.venueType = formData.venueType;
      }

      await onUpdateContact(updates);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Contact Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Información de Contacto</h3>
        
        {contact?.type === "person" ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Apellido</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  placeholder="Apellido"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">NIE o CIF</label>
              <Input
                value={formData.nieOrCif}
                onChange={(e) => handleChange("nieOrCif", e.target.value)}
                placeholder="Ingresa el NIE o CIF"
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Persona de contacto</label>
                <Input
                  value={formData.contactPersonName}
                  onChange={(e) => handleChange("contactPersonName", e.target.value)}
                  placeholder="Nombre del contacto"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email de contacto</label>
                <Input
                  type="email"
                  value={formData.contactPersonEmail}
                  onChange={(e) => handleChange("contactPersonEmail", e.target.value)}
                  placeholder="email@empresa.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">CIF/NIF</label>
                <Input
                  value={formData.taxId}
                  onChange={(e) => handleChange("taxId", e.target.value)}
                  placeholder="B12345678"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sitio Web</label>
                <Input
                  value={formData.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  placeholder="https://www.empresa.com"
                />
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <RiMailLine className="h-4 w-4" />
              Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="email@ejemplo.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <RiPhoneLine className="h-4 w-4" />
              Teléfono
            </label>
            <div className="flex gap-2">
              <Select
                value={formData.phoneCountryCode}
                onValueChange={(v) => handleChange("phoneCountryCode", v)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+34">🇪🇸 +34</SelectItem>
                  <SelectItem value="+1">🇺🇸 +1</SelectItem>
                  <SelectItem value="+44">🇬🇧 +44</SelectItem>
                  <SelectItem value="+33">🇫🇷 +33</SelectItem>
                  <SelectItem value="+49">🇩🇪 +49</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="612 345 678"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Event Info */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-sm font-medium text-muted-foreground">Información del Evento</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <RiCalendarLine className="h-4 w-4" />
              Fecha del evento
            </label>
            <Input
              type="date"
              value={formData.eventDate}
              onChange={(e) => handleChange("eventDate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <RiGroupLine className="h-4 w-4" />
              Invitados
            </label>
            <Input
              type="number"
              value={formData.guestCount}
              onChange={(e) => handleChange("guestCount", e.target.value)}
              placeholder="150"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <RiMoneyDollarCircleLine className="h-4 w-4" />
              Presupuesto (€)
            </label>
            <Input
              type="number"
              value={formData.budget}
              onChange={(e) => handleChange("budget", e.target.value)}
              placeholder="30000"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <RiBuilding2Line className="h-4 w-4" />
              Tipo de Venue
            </label>
            <Select
              value={formData.venueType}
              onValueChange={(v) => handleChange("venueType", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="finca">Finca</SelectItem>
                <SelectItem value="restaurante">Restaurante</SelectItem>
                <SelectItem value="playa">Playa</SelectItem>
                <SelectItem value="jardin">Jardín</SelectItem>
                <SelectItem value="salon">Salón de eventos</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Linked Events & Tasks */}
      {(linkedEvents.length > 0 || linkedTasks.length > 0) && (
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <RiLinksLine className="h-4 w-4" />
            Vinculaciones
          </h3>
          
          {linkedEvents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Eventos vinculados</p>
              <div className="flex flex-wrap gap-2">
                {linkedEvents.map((event) => (
                  <Badge key={event.id} variant="outline" className="gap-1">
                    {event.eventName}
                    {event.role && <span className="text-muted-foreground">({event.role})</span>}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {linkedTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Tareas vinculadas</p>
              <div className="flex flex-wrap gap-2">
                {linkedTasks.map((task) => (
                  <Badge key={task.id} variant="outline" className="gap-1">
                    {task.taskTitle}
                    <span className={`text-xs ${task.taskStatus === "completed" ? "text-green-500" : "text-yellow-500"}`}>
                      ({task.taskStatus})
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2 border-t pt-4">
        <label className="text-sm font-medium">Comentarios</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Notas o comentarios sobre el contacto..."
          rows={4}
        />
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <RiSaveLine className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      )}
    </div>
  );
}
