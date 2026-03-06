"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  RiStore2Line,
  RiMapPinLine,
  RiGlobalLine,
} from "@remixicon/react";
import { ContactRelationshipsSection } from "./contact-relationships-section";
import {
  PERSON_CATEGORIES,
  COMPANY_CATEGORIES,
  VENDOR_CATEGORIES,
} from "@/lib/constants/contact-categories";

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
  category: string | null;
  isVendor: boolean | null;
  vendorCategory: string | null;
  vendorId: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
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

const countries = [
  { code: "ES", name: "España" },
  { code: "US", name: "Estados Unidos" },
  { code: "GB", name: "Reino Unido" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Alemania" },
  { code: "IT", name: "Italia" },
  { code: "PT", name: "Portugal" },
  { code: "MX", name: "México" },
  { code: "AR", name: "Argentina" },
  { code: "BR", name: "Brasil" },
  { code: "CO", name: "Colombia" },
  { code: "CL", name: "Chile" },
];

export interface GeneralFormData {
  email: string;
  phone: string;
  phoneCountryCode: string;
  firstName: string;
  lastName: string;
  nieOrCif: string;
  tradeName: string;
  taxId: string;
  website: string;
  contactPersonName: string;
  contactPersonEmail: string;
  notes: string;
  category: string;
  isVendor: boolean;
  vendorCategory: string;
  customCategory: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface ContactGeneralTabProps {
  contact: ContactDetail | null;
  loading: boolean;
  formData: GeneralFormData;
  onFieldChange: (field: string, value: string | boolean) => void;
  linkedEvents: LinkedEvent[];
  linkedTasks: LinkedTask[];
  relationships?: ContactRelationship[];
  onAddRelationship?: (relatedContactId: number, role?: string) => Promise<void>;
  onRemoveRelationship?: (relationshipId: number) => Promise<void>;
  onOpenRelatedContact?: (contactId: number) => void;
}

export function ContactGeneralTab({
  contact,
  loading,
  formData,
  onFieldChange,
  linkedEvents,
  linkedTasks,
  relationships = [],
  onAddRelationship,
  onRemoveRelationship,
  onOpenRelatedContact,
}: ContactGeneralTabProps) {
  const handleChange = (field: string, value: string | boolean) => {
    onFieldChange(field, value);
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
      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-8">
        {/* Left Column: Address + Fiscal */}
        <div className="space-y-4">
          {/* Person-specific: Name fields */}
          {contact?.type === "person" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Apellido</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Company-specific: Contact person */}
          {contact?.type === "company" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Persona de contacto</label>
                <Input
                  value={formData.contactPersonName}
                  onChange={(e) => handleChange("contactPersonName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email de contacto</label>
                <Input
                  type="email"
                  value={formData.contactPersonEmail}
                  onChange={(e) => handleChange("contactPersonEmail", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <RiMapPinLine className="h-4 w-4" />
              Dirección
            </label>
            <Input
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Población</label>
              <Input
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Código postal</label>
              <Input
                value={formData.postalCode}
                onChange={(e) => handleChange("postalCode", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Provincia</label>
              <Input
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">País</label>
              <Select
                value={formData.country}
                onValueChange={(v) => handleChange("country", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Nombre comercial (both types) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre comercial</label>
            <Input
              value={formData.tradeName}
              onChange={(e) => handleChange("tradeName", e.target.value)}
            />
          </div>

          {/* Tax identification - per type */}
          {contact?.type === "person" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">NIF / NIE</label>
              <Input
                value={formData.nieOrCif}
                onChange={(e) => handleChange("nieOrCif", e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Identificación VAT</label>
              <Input
                value={formData.taxId}
                onChange={(e) => handleChange("taxId", e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Right Column: Contact + Classification */}
        <div className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <RiMailLine className="h-4 w-4" />
              Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>

          {/* Phone */}
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
                className="flex-1"
              />
            </div>
          </div>

          {/* Website (both types) */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <RiGlobalLine className="h-4 w-4" />
              Website
            </label>
            <Input
              value={formData.website}
              onChange={(e) => handleChange("website", e.target.value)}
            />
          </div>

          {/* Category + Type selectors */}
          {!formData.isVendor && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Select
                value={formData.category}
                onValueChange={(v) => handleChange("category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  {(contact?.type === "company" ? COMPANY_CATEGORIES : PERSON_CATEGORIES).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Vendor Section */}
      {contact && (
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <RiStore2Line className="h-4 w-4" />
            Proveedor
          </h3>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isVendor"
              checked={formData.isVendor}
              onCheckedChange={(checked) => handleChange("isVendor", checked === true)}
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
                  onValueChange={(v) => handleChange("vendorCategory", v)}
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
                    onChange={(e) => handleChange("customCategory", e.target.value)}
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
          onOpenRelatedContact={onOpenRelatedContact}
        />
      )}

    </div>
  );
}
