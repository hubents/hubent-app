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
import { Checkbox } from "@/components/ui/checkbox";
import {
  RiMailLine,
  RiPhoneLine,
  RiLinksLine,
  RiSaveLine,
  RiStore2Line,
} from "@remixicon/react";
import { ContactRelationshipsSection } from "./contact-relationships-section";

const VENDOR_CATEGORIES = [
  "Catering",
  "Fotografía",
  "Floristería",
  "Música",
  "Pastelería",
  "Decoración",
  "Venue",
  "Transporte",
  "Otro",
];

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
  tags: string[] | null;
  source: string | null;
  isLead: boolean | null;
  leadScore: number | null;
  notes: string | null;
  isVendor: boolean | null;
  vendorCategory: string | null;
  vendorId: number | null;
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

interface ContactRelationship {
  id: number;
  role: string | null;
  isPrimary: boolean | null;
  relatedContactId: number;
  relatedContactName: string;
  relatedContactEmail: string | null;
  relatedContactAvatar: string | null;
  relatedContactType: "person" | "company";
}

interface ContactGeneralTabProps {
  contact: ContactDetail | null;
  loading: boolean;
  onUpdateContact: (updates: Record<string, unknown>) => Promise<unknown>;
  linkedEvents: LinkedEvent[];
  linkedTasks: LinkedTask[];
  relationships?: ContactRelationship[];
  onAddRelationship?: (relatedContactId: number, role?: string) => Promise<void>;
  onRemoveRelationship?: (relationshipId: number) => Promise<void>;
}

export function ContactGeneralTab({
  contact,
  loading,
  onUpdateContact,
  linkedEvents,
  linkedTasks,
  relationships = [],
  onAddRelationship,
  onRemoveRelationship,
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
    notes: "",
    isVendor: false,
    vendorCategory: "",
    customCategory: "",
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (contact) {
      const isCustomCategory = contact.vendorCategory && !VENDOR_CATEGORIES.includes(contact.vendorCategory);
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
        notes: contact.notes || "",
        isVendor: contact.isVendor || false,
        vendorCategory: isCustomCategory ? "Otro" : (contact.vendorCategory || ""),
        customCategory: isCustomCategory ? contact.vendorCategory || "" : "",
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
        updates.isVendor = formData.isVendor;
        updates.vendorCategory = formData.vendorCategory === "Otro" 
          ? formData.customCategory || null 
          : formData.vendorCategory || null;
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

      {/* Vendor Section - Only for Companies */}
      {contact?.type === "company" && (
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <RiStore2Line className="h-4 w-4" />
            Proveedor
          </h3>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isVendor"
              checked={formData.isVendor}
              onCheckedChange={(checked) => {
                setFormData((prev) => ({ ...prev, isVendor: checked === true }));
                setHasChanges(true);
              }}
              disabled={!!contact.vendorId}
            />
            <label
              htmlFor="isVendor"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              ¿Es proveedor?
            </label>
            {contact.vendorId && (
              <span className="text-xs text-muted-foreground">(Ya registrado como proveedor)</span>
            )}
          </div>

          {formData.isVendor && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select
                  value={formData.vendorCategory}
                  onValueChange={(v) => {
                    setFormData((prev) => ({ ...prev, vendorCategory: v }));
                    setHasChanges(true);
                  }}
                  disabled={!!contact.vendorId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {VENDOR_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.vendorCategory === "Otro" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categoría personalizada</label>
                  <Input
                    value={formData.customCategory}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, customCategory: e.target.value }));
                      setHasChanges(true);
                    }}
                    placeholder="Ej: Iluminación"
                    disabled={!!contact.vendorId}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

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

      {/* Relationships Section */}
      {contact && onAddRelationship && onRemoveRelationship && (
        <ContactRelationshipsSection
          contactId={contact.id}
          contactType={contact.type}
          relationships={relationships}
          onAddRelationship={onAddRelationship}
          onRemoveRelationship={onRemoveRelationship}
        />
      )}

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
