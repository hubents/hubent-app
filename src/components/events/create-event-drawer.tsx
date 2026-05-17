"use client";

import { useEffect, useState } from "react";
import { handleBillingError } from "@/lib/billing-errors";
import { TemplateSelector } from "@/components/events/template-selector";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Cancel01Icon,
  File01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

const IcoX = hgIcon(Cancel01Icon);
const IcoDoc = hgIcon(File01Icon);
const IcoInfo = hgIcon(InformationCircleIcon);

interface Contact {
  id: number;
  type: "person" | "company";
  name: string;
  email: string | null;
  avatar: string | null;
}

/**
 * When `editEvent` is provided the drawer turns into an "edit" panel:
 *  - hydrates from the event
 *  - PATCHes /api/events/:id instead of POSTing
 *  - hides the template picker + cliente block (only relevant on creation)
 *  - changes header / submit copy accordingly
 */
interface EditEventInput {
  id: number;
  name: string;
  type: string;
  date: string | null;
  endDate?: string | null;
  location: string | null;
  guestCount: number | null;
  budget: string | null;
  description: string | null;
}

interface CreateEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated?: (created?: { id: number }) => void;
  /** Pre-fill values for the create flow (from CRM lead conversion etc.) */
  prefill?: Partial<{
    name: string;
    eventType: string;
    date: string;
    endDate: string;
    venue: string;
    guestCount: string;
    budget: string;
    description: string;
  }>;
  /** When set, drawer is in edit mode for that event. */
  editEvent?: EditEventInput | null;
  onEventUpdated?: () => void;
}

// Mismo set que el prototipo (events.jsx → EVENT_TYPES) mapeado al enum DB.
const EVENT_TYPES: { label: string; value: string }[] = [
  { label: "Boda", value: "wedding" },
  { label: "Pre-Boda", value: "pre_wedding" },
  { label: "Post-Boda", value: "post_wedding" },
  { label: "Cumpleaños", value: "birthday" },
  { label: "Corporativo", value: "corporate" },
  { label: "Social", value: "social" },
  { label: "Otro", value: "other" },
];

export function CreateEventDrawer({
  open,
  onOpenChange,
  onEventCreated,
  prefill,
  editEvent,
  onEventUpdated,
}: CreateEventDrawerProps) {
  const isEdit = !!editEvent;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("wedding");
  const [customType, setCustomType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");

  // Templates + Contacts (datos remotos)
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const reset = () => {
    setName("");
    setEventType("wedding");
    setCustomType("");
    setStartDate("");
    setEndDate("");
    setBudget("");
    setGuestCount("");
    setVenue("");
    setDescription("");
    setClientId("");
    setSelectedTemplateId(null);
    setSelectedTemplateName(null);
    setError(null);
  };

  // Cargar contactos al abrir — solo en modo creación (cliente select)
  useEffect(() => {
    if (!open || isEdit) return;
    fetch("/api/contacts?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setContacts(d.data?.data || []);
      })
      .catch(() => {});
  }, [open, isEdit]);

  // Hidratar form al transición closed → open. Edit mode (editEvent) tiene
  // prioridad sobre prefill (que es para conversión de leads en CRM).
  useEffect(() => {
    if (!open) return;
    if (editEvent) {
      setName(editEvent.name || "");
      setEventType(editEvent.type || "wedding");
      setStartDate(editEvent.date ? editEvent.date.split("T")[0] : "");
      setEndDate(editEvent.endDate ? editEvent.endDate.split("T")[0] : "");
      setVenue(editEvent.location || "");
      setGuestCount(
        editEvent.guestCount != null ? editEvent.guestCount.toString() : "",
      );
      setBudget(editEvent.budget || "");
      setDescription(editEvent.description || "");
      setError(null);
      return;
    }
    if (!prefill) return;
    if (prefill.name !== undefined) setName(prefill.name);
    if (prefill.eventType !== undefined) setEventType(prefill.eventType);
    if (prefill.date !== undefined) setStartDate(prefill.date);
    if (prefill.endDate !== undefined) setEndDate(prefill.endDate);
    if (prefill.venue !== undefined) setVenue(prefill.venue);
    if (prefill.guestCount !== undefined) setGuestCount(prefill.guestCount);
    if (prefill.budget !== undefined) setBudget(prefill.budget);
    if (prefill.description !== undefined) setDescription(prefill.description);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    onOpenChange(false);
    setTimeout(reset, 200); // Permite la animación de salida antes del reset
  };

  const finalEventType = eventType === "other" && customType.trim()
    ? "other"
    : eventType;
  const isValid = name.trim().length > 0 && finalEventType.length > 0;

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        type: finalEventType,
        customType:
          eventType === "other" && customType.trim()
            ? customType.trim()
            : undefined,
        date: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        location: venue || null,
        guestCount: guestCount ? parseInt(guestCount) : 0,
        budget: budget ? parseFloat(budget.replace(/[^\d.]/g, "")) : null,
        description: description || null,
      };

      const res = isEdit
        ? await fetch(`/api/events/${editEvent!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              // Create-only extras
              templateId: selectedTemplateId || undefined,
            }),
          });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (isEdit) {
          close();
          onEventUpdated?.();
        } else {
          if (clientId && data.data?.id) {
            try {
              await fetch(`/api/events/${data.data.id}/collaborators`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contactId: parseInt(clientId),
                  type: "contact",
                  role: "client",
                }),
              });
            } catch {
              /* link best-effort */
            }
          }
          const created = data.data ? { id: data.data.id } : undefined;
          close();
          onEventCreated?.(created);
        }
      } else {
        const msg =
          (typeof data?.error?.message === "string" && data.error.message) ||
          (typeof data.error === "string" && data.error) ||
          (isEdit
            ? "Error al actualizar el evento"
            : "Error al crear el evento");
        if (!handleBillingError(msg)) {
          setError(msg);
        }
      }
    } catch (err) {
      console.error(isEdit ? "edit event:" : "create event:", err);
      setError(
        isEdit
          ? "No se pudo guardar los cambios. Intenta de nuevo."
          : "No se pudo crear el evento. Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end"
      style={{ background: "rgba(20, 18, 12, 0.35)" }}
      onClick={close}
    >
      <div
        className="flex flex-col overflow-y-auto"
        style={{
          width: 420,
          background: "#FFFFFF",
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
          padding: "24px 26px",
          gap: 14,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start">
          <div className="flex-1">
            <div
              className="text-[18px] font-semibold text-[var(--ink-1)]"
              style={{ letterSpacing: "-0.01em" }}
            >
              {isEdit ? "Editar evento" : "Nuevo evento"}
            </div>
            <div className="text-[12.5px] text-[var(--ink-3)] mt-0.5">
              {isEdit
                ? "Modifica los detalles del evento"
                : "Crea un evento nuevo para comenzar"}
            </div>
          </div>
          <button
            onClick={close}
            className="bg-transparent border-none cursor-pointer text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors"
          >
            <IcoX className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Nombre del evento */}
        <Field label="Nombre del evento">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Cami y Juanca"
            autoFocus
          />
        </Field>

        {/* Botón Usar Template — solo en creación, no editando */}
        {!isEdit && (
          <button
            type="button"
            onClick={() => setShowTemplatePicker(true)}
            className="flex items-center justify-center gap-1.5 cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]"
            style={{
              border: "1px dashed var(--line-strong)",
              background: "transparent",
              padding: 10,
              borderRadius: 8,
              fontSize: 13,
              color: "var(--ink-2)",
            }}
          >
            <IcoDoc className="h-3.5 w-3.5" />
            {selectedTemplateName ? `Template: ${selectedTemplateName}` : "Usar Template"}
          </button>
        )}

        {/* Tipo de evento */}
        <Field label="Tipo de evento">
          <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        {/* Si "Otro": especifica */}
        {eventType === "other" && (
          <Field label="Especifica el tipo">
            <input
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="Ej. Aniversario, Comunión, Despedida…"
              autoFocus
            />
          </Field>
        )}

        {/* Fechas — grid 2 col */}
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Fecha de inicio">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Fecha de finalización">
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>

        {/* Presupuesto + Invitados — grid 2 col */}
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Presupuesto">
            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="€0,00"
            />
          </Field>
          <Field label="Número de invitados">
            <input
              type="number"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>

        {/* Lugar */}
        <Field label="Lugar del evento">
          <AddressAutocomplete
            value={venue}
            onChange={setVenue}
            onSelect={(s) => setVenue(s.venueName || s.street || s.displayName.split(",")[0])}
            placeholder="Ej. Casa de la Era"
          />
        </Field>

        {/* Descripción */}
        <Field label="Descripción del evento">
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles adicionales del evento..."
            style={{ resize: "vertical" }}
          />
        </Field>

        {/* Cliente — solo en creación, en edición se gestiona desde colaboradores */}
        {!isEdit && (
          <>
            <div
              className="text-[11px] font-semibold uppercase text-[var(--ink-3)] mt-2"
              style={{ letterSpacing: "0.08em" }}
            >
              Cliente
            </div>
            <Field label="Elige un cliente">
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Elige un cliente</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.email ? ` · ${c.email}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        {error && (
          <div
            className="flex items-start gap-2 rounded-[8px]"
            style={{
              padding: "10px 12px",
              background: "var(--danger-bg)",
              border: "1px solid #F0C9C2",
              color: "var(--danger-ink)",
              fontSize: 12,
            }}
          >
            <IcoInfo className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit (botón único como en prototipo) */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          aria-disabled={!isValid || loading}
          className="cursor-pointer rounded-[8px] text-[14px] font-semibold border-none mt-2"
          style={{
            background: !isValid || loading ? "var(--line-strong)" : "var(--color-primary)",
            color: "#FFFFFF",
            padding: 12,
            cursor: !isValid || loading ? "not-allowed" : "pointer",
          }}
        >
          {loading
            ? isEdit
              ? "Guardando..."
              : "Creando..."
            : isEdit
              ? "Guardar cambios"
              : "Crear evento"}
        </button>
      </div>

      {/* Template picker — inline modal sobre el drawer */}
      {showTemplatePicker && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center"
          style={{ background: "rgba(20, 18, 12, 0.5)" }}
          onClick={() => setShowTemplatePicker(false)}
        >
          <div
            className="flex flex-col"
            style={{
              width: 480,
              maxHeight: "85vh",
              background: "#FFFFFF",
              borderRadius: 12,
              padding: "20px 22px",
              gap: 14,
              boxShadow: "0 12px 32px rgba(0,0,0,.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start">
              <div className="flex-1">
                <div
                  className="text-[17px] font-semibold text-[var(--ink-1)]"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  Elegir template
                </div>
                <div className="text-[12.5px] text-[var(--ink-3)] mt-0.5">
                  Las tareas y checklists del template se importarán al evento
                </div>
              </div>
              <button
                onClick={() => setShowTemplatePicker(false)}
                className="bg-transparent border-none cursor-pointer text-[var(--ink-3)] hover:text-[var(--ink-1)]"
              >
                <IcoX className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TemplateSelector
                selectedTemplateId={selectedTemplateId}
                onSelect={(id) => {
                  setSelectedTemplateId(id);
                  // El nombre lo actualizamos via el render del TemplateSelector
                  // (no expone label en onSelect). Nos basta con id para el POST.
                  setSelectedTemplateName(id ? `#${id}` : null);
                }}
                eventType={eventType}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--line-1)" }}>
              <button
                onClick={() => {
                  setSelectedTemplateId(null);
                  setSelectedTemplateName(null);
                }}
                className="cursor-pointer rounded-[8px] text-[13px] font-medium border-none"
                style={{
                  background: "var(--bg-subtle)",
                  color: "var(--ink-2)",
                  padding: "8px 14px",
                }}
              >
                Sin template
              </button>
              <button
                onClick={() => setShowTemplatePicker(false)}
                className="cursor-pointer rounded-[8px] text-[13px] font-semibold"
                style={{
                  background: "var(--color-primary)",
                  color: "#FFFFFF",
                  border: "1px solid var(--color-primary)",
                  padding: "8px 14px",
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Field helper — label + input/select/textarea con styling sand
// ============================================================
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12.5px] font-medium text-[var(--ink-1)]">{label}</label>
      <div className="ev-field">{children}</div>
      <style jsx>{`
        :global(.ev-field input),
        :global(.ev-field select),
        :global(.ev-field textarea) {
          width: 100%;
          padding: 11px 13px;
          border: 1px solid var(--line-strong);
          border-radius: 8px;
          background: #ffffff;
          font-family: inherit;
          font-size: 13.5px;
          color: var(--ink-1);
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.12s, box-shadow 0.12s;
        }
        :global(.ev-field input:focus),
        :global(.ev-field select:focus),
        :global(.ev-field textarea:focus) {
          border-color: var(--ink-1);
          box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.08);
        }
        :global(.ev-field input::placeholder),
        :global(.ev-field textarea::placeholder) {
          color: var(--ink-3);
        }
      `}</style>
    </div>
  );
}
