"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Cancel01Icon,
  UserCircleIcon,
  PlusSignIcon,
  Building01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";

const IcoX = hgIcon(Cancel01Icon);
const IcoUser = hgIcon(UserCircleIcon);
const IcoPlus = hgIcon(PlusSignIcon);
const IcoCompany = hgIcon(Building01Icon);
const IcoInfo = hgIcon(InformationCircleIcon);

interface Contact {
  id: number;
  type: "person" | "company";
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
}

interface CreateLeadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated?: () => void;
  stageId?: number;
  preselectedContact?: Contact;
}

export function CreateLeadDrawer({
  open,
  onOpenChange,
  onLeadCreated,
  stageId,
  preselectedContact,
}: CreateLeadDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [contactMode, setContactMode] = useState<"existing" | "new">("existing");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [newContactType, setNewContactType] = useState<"person" | "company">("person");
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [valueAmount, setValueAmount] = useState("");
  const [probability, setProbability] = useState("50");
  const [source, setSource] = useState("");
  const [closeDate, setCloseDate] = useState("");

  const reset = () => {
    setContactMode("existing");
    setSelectedContactId("");
    setNewContactType("person");
    setNewContactName("");
    setNewContactEmail("");
    setTitle("");
    setDescription("");
    setValueAmount("");
    setProbability("50");
    setSource("");
    setCloseDate("");
  };

  useEffect(() => {
    if (preselectedContact) {
      setSelectedContactId(String(preselectedContact.id));
      if (!title) setTitle(preselectedContact.name);
    }
  }, [preselectedContact, title]);

  useEffect(() => {
    if (!open || contactMode !== "existing") return;
    fetch("/api/contacts?limit=50")
      .then((r) => r.json())
      .then((d) => { if (d.success) setContacts(d.data?.data || []); })
      .catch(() => {});
  }, [open, contactMode]);

  const validEmail = /^\S+@\S+\.\S+$/.test(newContactEmail);
  const isValid =
    title.trim().length > 0 &&
    ((contactMode === "existing" && selectedContactId) ||
      (contactMode === "new" && newContactName.trim().length > 1 && validEmail));

  const close = () => { onOpenChange(false); reset(); };

  const submit = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    try {
      let contactId: number | null = selectedContactId ? Number(selectedContactId) : null;

      if (contactMode === "new") {
        const cRes = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: newContactType,
            name: newContactName.trim(),
            email: newContactEmail || null,
          }),
        });
        if (!cRes.ok) throw new Error("Error al crear contacto");
        const cData = await cRes.json();
        contactId = cData.data?.id ?? null;
      }

      if (!contactId) throw new Error("Falta el contacto");

      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description || null,
          value: valueAmount ? parseFloat(valueAmount) : null,
          probability: parseInt(probability) || 50,
          source: source || null,
          expectedCloseDate: closeDate ? new Date(closeDate) : null,
          stageId: stageId || null,
          contactId,
        }),
      });
      if (!res.ok) throw new Error("Error al crear lead");

      close();
      onLeadCreated?.();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <SheetContent
        side="right"
        className="overflow-y-auto bg-white border-0 rounded-l-2xl [&>button]:hidden"
        style={{
          width: 420,
          maxWidth: "100vw",
          padding: "24px 26px",
          gap: 14,
        }}
      >
        {/* Header */}
        <div className="flex items-start">
          <div className="flex-1">
            <div
              className="text-[18px] font-semibold text-[var(--ink-1)]"
              style={{ letterSpacing: "-0.01em" }}
            >
              Nuevo Lead
            </div>
            <div className="text-[12.5px] text-[var(--ink-3)] mt-0.5">
              Todo lead debe estar asociado a un contacto
            </div>
          </div>
          <button
            onClick={close}
            className="bg-transparent border-none cursor-pointer text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors"
          >
            <IcoX className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Contact toggle */}
        <div>
          <label
            className="block text-[12.5px] font-medium text-[var(--ink-1)] mb-1.5"
          >
            Contacto *
          </label>
          <div
            className="flex gap-1.5 rounded-[8px] mb-2"
            style={{ background: "var(--bg-subtle)", padding: "3px" }}
          >
            <button
              type="button"
              onClick={() => setContactMode("existing")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[6px] cursor-pointer border-none transition-colors"
              style={{
                padding: "7px 10px",
                background: contactMode === "existing" ? "#FFFFFF" : "transparent",
                color: contactMode === "existing" ? "var(--ink-1)" : "var(--ink-3)",
                fontWeight: contactMode === "existing" ? 600 : 500,
                fontSize: 12.5,
                boxShadow: contactMode === "existing" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              <IcoUser className="h-3 w-3" /> Existente
            </button>
            <button
              type="button"
              onClick={() => setContactMode("new")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[6px] cursor-pointer border-none transition-colors"
              style={{
                padding: "7px 10px",
                background: contactMode === "new" ? "#FFFFFF" : "transparent",
                color: contactMode === "new" ? "var(--ink-1)" : "var(--ink-3)",
                fontWeight: contactMode === "new" ? 600 : 500,
                fontSize: 12.5,
                boxShadow: contactMode === "new" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              <IcoPlus className="h-3 w-3" /> Nuevo
            </button>
          </div>

          {contactMode === "existing" ? (
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full text-[13.5px] text-[var(--ink-1)] outline-none"
              style={{
                padding: "11px 13px",
                border: "1px solid var(--line-strong)",
                borderRadius: 8,
                background: "#FFFFFF",
              }}
            >
              <option value="">Buscar tu contacto...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.email ? `· ${c.email}` : ""}
                </option>
              ))}
            </select>
          ) : (
            <div
              className="flex flex-col gap-2"
              style={{
                padding: "12px 12px 4px",
                border: "1px dashed var(--line-strong)",
                borderRadius: 8,
                background: "var(--bg-subtle)",
              }}
            >
              <div className="text-[11px] text-[var(--ink-3)] inline-flex items-center gap-1.5">
                <IcoInfo className="h-3 w-3" />
                Se creará un contacto nuevo al guardar el lead
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setNewContactType("person")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[6px] cursor-pointer transition-colors"
                  style={{
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: newContactType === "person" ? 600 : 500,
                    background: newContactType === "person" ? "#FFFFFF" : "transparent",
                    color: newContactType === "person" ? "var(--ink-1)" : "var(--ink-3)",
                    border: "1px solid " + (newContactType === "person" ? "var(--line-1)" : "transparent"),
                  }}
                >
                  <IcoUser className="h-3 w-3" /> Persona
                </button>
                <button
                  type="button"
                  onClick={() => setNewContactType("company")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[6px] cursor-pointer transition-colors"
                  style={{
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: newContactType === "company" ? 600 : 500,
                    background: newContactType === "company" ? "#FFFFFF" : "transparent",
                    color: newContactType === "company" ? "var(--ink-1)" : "var(--ink-3)",
                    border: "1px solid " + (newContactType === "company" ? "var(--line-1)" : "transparent"),
                  }}
                >
                  <IcoCompany className="h-3 w-3" /> Empresa
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11.5px] text-[var(--ink-2)] font-medium">
                  {newContactType === "company" ? "Nombre de la empresa *" : "Nombre completo *"}
                </label>
                <input
                  autoFocus
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder={newContactType === "company" ? "Ej. Studio Bouquet" : "Ej. Laura Marín"}
                  className="text-[13.5px] outline-none"
                  style={{
                    padding: "9px 12px",
                    border: "1px solid var(--line-strong)",
                    borderRadius: 8,
                    background: "#FFFFFF",
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11.5px] text-[var(--ink-2)] font-medium">Email *</label>
                <input
                  type="email"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="laura@email.com"
                  className="text-[13.5px] outline-none"
                  style={{
                    padding: "9px 12px",
                    border: "1px solid var(--line-strong)",
                    borderRadius: 8,
                    background: "#FFFFFF",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Detalles del lead — eyebrow */}
        <div
          className="text-[11px] font-semibold uppercase text-[var(--ink-3)] mt-2"
          style={{ letterSpacing: "0.08em" }}
        >
          Detalles del lead
        </div>

        <Field label="Título del lead *">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. BJ: Boda Junio 2026"
          />
        </Field>

        <Field label="Descripción">
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles adicionales del lead..."
            style={{ resize: "vertical" }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Valor estimado">
            <input
              type="number"
              value={valueAmount}
              onChange={(e) => setValueAmount(e.target.value)}
              placeholder="€ 0,00"
            />
          </Field>
          <Field label="Probabilidad de cierre">
            <select value={probability} onChange={(e) => setProbability(e.target.value)}>
              <option value="10">10%</option>
              <option value="25">25%</option>
              <option value="50">50%</option>
              <option value="75">75%</option>
              <option value="90">90%</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Fuente">
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">Elige una opción</option>
              <option value="website">Sitio Web</option>
              <option value="referral">Referido</option>
              <option value="social">Redes Sociales</option>
              <option value="event">Evento</option>
              <option value="cold">Contacto Frío</option>
              <option value="other">Otro</option>
            </select>
          </Field>
          <Field label="Fecha estimada de cierre">
            <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
          </Field>
        </div>

        <button
          onClick={submit}
          disabled={!isValid || loading}
          aria-disabled={!isValid || loading}
          className="rounded-[8px] cursor-pointer transition-colors mt-2 border-none"
          style={{
            background: !isValid || loading ? "var(--line-strong)" : "var(--ink-1)",
            color: "#FFFFFF",
            padding: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: !isValid || loading ? "not-allowed" : "pointer",
          }}
        >
          {loading
            ? "Creando..."
            : contactMode === "new"
              ? "Crear contacto y lead"
              : "Crear lead"}
        </button>
      </SheetContent>
    </Sheet>
  );
}

// Helper: form field with label + content
// Inputs/textareas/selects inside use the prototype's input style via global rules below.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12.5px] font-medium text-[var(--ink-1)]">{label}</label>
      <div className="cld-field-input">{children}</div>
      <style jsx>{`
        :global(.cld-field-input input),
        :global(.cld-field-input select),
        :global(.cld-field-input textarea) {
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
        :global(.cld-field-input input:focus),
        :global(.cld-field-input select:focus),
        :global(.cld-field-input textarea:focus) {
          border-color: var(--ink-1);
          box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.08);
        }
        :global(.cld-field-input input::placeholder),
        :global(.cld-field-input textarea::placeholder) {
          color: var(--ink-3);
        }
      `}</style>
    </div>
  );
}
