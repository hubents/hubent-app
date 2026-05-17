"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { hgIcon } from "@/components/ui/hg-icon";
import { PHONE_PREFIXES, COUNTRIES } from "@/lib/constants/locale";
import {
  Mail01Icon,
  CallIcon,
  Globe02Icon,
  Store01Icon,
  Location01Icon,
  Link01Icon,
  Calendar03Icon,
  Task01Icon,
} from "@hugeicons/core-free-icons";
import { ContactRelationshipsSection } from "./contact-relationships-section";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import {
  PERSON_CATEGORIES,
  COMPANY_CATEGORIES,
  VENDOR_CATEGORIES,
} from "@/lib/constants/contact-categories";

const IcoMail = hgIcon(Mail01Icon);
const IcoPhone = hgIcon(CallIcon);
const IcoGlobe = hgIcon(Globe02Icon);
const IcoStore = hgIcon(Store01Icon);
const IcoMap = hgIcon(Location01Icon);
const IcoLink = hgIcon(Link01Icon);
const IcoCalendar = hgIcon(Calendar03Icon);
const IcoTask = hgIcon(Task01Icon);

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

// Re-use shared COUNTRIES list (flags included)
const countries = COUNTRIES;

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

// Field — wraps label + control(s) with prototype-styled inputs.
function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 drawer-form-field">
      <label className="text-[12px] font-medium text-[var(--ink-2)] inline-flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10.5px] font-semibold uppercase text-[var(--ink-3)]"
      style={{ letterSpacing: "0.08em" }}
    >
      {children}
    </div>
  );
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
  const [lookingUpPostal, setLookingUpPostal] = useState(false);

  const handleChange = (field: string, value: string | boolean) => {
    onFieldChange(field, value);
  };

  const handlePostalLookup = async (postalCode: string, countryCode?: string) => {
    if (!postalCode.trim() || postalCode.length < 3) return;
    setLookingUpPostal(true);
    try {
      const params = new URLSearchParams({ postalCode: postalCode.trim() });
      if (countryCode) params.set("countryCode", countryCode);
      const res = await fetch(`/api/postal-lookup?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.city) onFieldChange("city", data.city);
      if (data.countryCode && !countryCode) onFieldChange("country", data.countryCode);
    } catch { /* silently ignore */ }
    finally { setLookingUpPostal(false); }
  };

  const phoneFormat = PHONE_PREFIXES.find(p => p.prefix === formData.phoneCountryCode)?.phoneFormat ?? "000 000 000";

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: name/contact-person + address + fiscal */}
        <div className="flex flex-col gap-3.5">
          {contact?.type === "person" && (
            <>
              <Eyebrow>Datos personales</Eyebrow>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Nombre">
                  <input
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                  />
                </Field>
                <Field label="Apellido">
                  <input
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                  />
                </Field>
              </div>
            </>
          )}

          {contact?.type === "company" && (
            <>
              <Eyebrow>Persona de contacto</Eyebrow>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Persona de contacto">
                  <input
                    value={formData.contactPersonName}
                    onChange={(e) => handleChange("contactPersonName", e.target.value)}
                  />
                </Field>
                <Field label="Email de contacto">
                  <input
                    type="email"
                    value={formData.contactPersonEmail}
                    onChange={(e) => handleChange("contactPersonEmail", e.target.value)}
                  />
                </Field>
              </div>
            </>
          )}

          <Eyebrow>Dirección</Eyebrow>
          <Field label="Dirección" icon={<IcoMap className="h-3 w-3" />}>
            <AddressAutocomplete
              value={formData.address ?? ""}
              onChange={(val) => handleChange("address", val)}
              onSelect={(s) => {
                handleChange("address", s.street || s.displayName.split(",")[0]);
                if (s.city) handleChange("city", s.city);
                if (s.state) handleChange("state", s.state);
                if (s.postalCode) handleChange("postalCode", s.postalCode);
                if (s.countryCode) handleChange("country", s.countryCode);
              }}
              countryCode={formData.country || undefined}
              placeholder="Calle, número, piso..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label={lookingUpPostal ? "Población (buscando…)" : "Población"}>
              <input
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Madrid"
              />
            </Field>
            <Field label="Código postal">
              <input
                value={formData.postalCode}
                onChange={(e) => handleChange("postalCode", e.target.value)}
                onBlur={(e) => handlePostalLookup(e.target.value, formData.country || undefined)}
                placeholder="28001"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Provincia">
              <input
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
              />
            </Field>
            <Field label="País">
              <select
                value={formData.country}
                onChange={(e) => {
                  handleChange("country", e.target.value);
                  if (formData.postalCode) handlePostalLookup(formData.postalCode, e.target.value);
                }}
              >
                <option value="">Seleccionar país</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Eyebrow>Identificación fiscal</Eyebrow>
          <Field label="Nombre comercial">
            <input
              value={formData.tradeName}
              onChange={(e) => handleChange("tradeName", e.target.value)}
            />
          </Field>

          {contact?.type === "person" ? (
            <Field label="NIF / NIE">
              <input
                value={formData.nieOrCif}
                onChange={(e) => handleChange("nieOrCif", e.target.value)}
                placeholder="00000000A"
              />
            </Field>
          ) : (
            <Field label="Identificación VAT / CIF">
              <input
                value={formData.taxId}
                onChange={(e) => handleChange("taxId", e.target.value)}
                placeholder="B-00000000"
              />
            </Field>
          )}
        </div>

        {/* Right column: contact + classification */}
        <div className="flex flex-col gap-3.5">
          <Eyebrow>Datos de contacto</Eyebrow>
          <Field label="Email" icon={<IcoMail className="h-3 w-3" />}>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="hello@example.com"
            />
          </Field>

          <Field label="Teléfono" icon={<IcoPhone className="h-3 w-3" />}>
            <div className="flex gap-1.5">
              <select
                value={formData.phoneCountryCode}
                onChange={(e) => handleChange("phoneCountryCode", e.target.value)}
                style={{ width: 96, flex: "0 0 96px" }}
              >
                {PHONE_PREFIXES.map(p => (
                  <option key={`${p.code}-${p.prefix}`} value={p.prefix}>
                    {p.flag} {p.prefix}
                  </option>
                ))}
              </select>
              <input
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder={phoneFormat}
                style={{ flex: 1 }}
              />
            </div>
          </Field>

          <Field label="Website" icon={<IcoGlobe className="h-3 w-3" />}>
            <input
              value={formData.website}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://..."
            />
          </Field>

          {!formData.isVendor && (
            <>
              <Eyebrow>Clasificación</Eyebrow>
              <Field label="Categoría">
                <select
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                >
                  <option value="">Sin especificar</option>
                  {(contact?.type === "company" ? COMPANY_CATEGORIES : PERSON_CATEGORIES).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
        </div>
      </div>

      {/* Vendor section */}
      {contact && (
        <div className="pt-5 border-t" style={{ borderColor: "var(--line-1)" }}>
          <div className="flex items-center gap-2 mb-3">
            <IcoStore className="h-4 w-4 text-[var(--ink-3)]" />
            <h3 className="text-[13px] font-semibold text-[var(--ink-1)]">Proveedor</h3>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isVendor}
              onChange={(e) => handleChange("isVendor", e.target.checked)}
              disabled={!!contact.vendorId}
              className="h-4 w-4 cursor-pointer"
              style={{ accentColor: "var(--ink-1)" }}
            />
            <span className="text-[13px] text-[var(--ink-1)]">¿Es proveedor?</span>
            {contact.vendorId && (
              <span className="text-[11px] text-[var(--ink-3)]">
                (Ya registrado como proveedor)
              </span>
            )}
          </label>

          {formData.isVendor && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3">
              <Field label="Categoría de proveedor">
                <select
                  value={formData.vendorCategory}
                  onChange={(e) => handleChange("vendorCategory", e.target.value)}
                  disabled={!!contact.vendorId}
                >
                  <option value="">Seleccionar categoría</option>
                  {VENDOR_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </Field>
              {formData.vendorCategory === "Otro" && (
                <Field label="Categoría personalizada">
                  <input
                    value={formData.customCategory}
                    onChange={(e) => handleChange("customCategory", e.target.value)}
                    disabled={!!contact.vendorId}
                  />
                </Field>
              )}
            </div>
          )}
        </div>
      )}

      {/* Linked Events & Tasks */}
      {(linkedEvents.length > 0 || linkedTasks.length > 0) && (
        <div className="pt-5 border-t" style={{ borderColor: "var(--line-1)" }}>
          <div className="flex items-center gap-2 mb-3">
            <IcoLink className="h-4 w-4 text-[var(--ink-3)]" />
            <h3 className="text-[13px] font-semibold text-[var(--ink-1)]">Vinculaciones</h3>
          </div>

          {linkedEvents.length > 0 && (
            <div className="mb-3">
              <p className="text-[11.5px] text-[var(--ink-3)] mb-1.5">Eventos vinculados</p>
              <div className="flex flex-wrap gap-1.5">
                {linkedEvents.map((event) => (
                  <span
                    key={event.id}
                    className="inline-flex items-center gap-1 rounded-[999px] text-[11.5px] px-2.5 py-1"
                    style={{
                      background: "transparent",
                      color: "var(--ink-2)",
                      border: "1px solid var(--line-1)",
                    }}
                  >
                    <IcoCalendar className="h-3 w-3" />
                    {event.eventName}
                    {event.role && (
                      <span className="text-[var(--ink-3)]">· {event.role}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {linkedTasks.length > 0 && (
            <div>
              <p className="text-[11.5px] text-[var(--ink-3)] mb-1.5">Tareas vinculadas</p>
              <div className="flex flex-wrap gap-1.5">
                {linkedTasks.map((task) => (
                  <span
                    key={task.id}
                    className="inline-flex items-center gap-1 rounded-[999px] text-[11.5px] px-2.5 py-1"
                    style={{
                      background: "transparent",
                      color: "var(--ink-2)",
                      border: "1px solid var(--line-1)",
                    }}
                  >
                    <IcoTask className="h-3 w-3" />
                    {task.taskTitle}
                    {task.taskStatus && (
                      <span
                        style={{
                          color: task.taskStatus === "completed" ? "var(--success-ink)" : "var(--warn-ink)",
                        }}
                      >
                        · {task.taskStatus}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="pt-5 border-t" style={{ borderColor: "var(--line-1)" }}>
        <Field label="Comentarios">
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            rows={4}
            placeholder="Notas adicionales sobre el contacto..."
            style={{ resize: "vertical" }}
          />
        </Field>
      </div>

      {/* Relationships */}
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
