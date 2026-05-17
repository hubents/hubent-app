"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Cancel01Icon,
  Tick01Icon,
  ArrowDown01Icon,
  ViewIcon,
  ViewOffSlashIcon,
  Edit02Icon,
} from "@hugeicons/core-free-icons";

const IcoX = hgIcon(Cancel01Icon);
const IcoCheck = hgIcon(Tick01Icon);
const IcoChevDown = hgIcon(ArrowDown01Icon);
const IcoEye = hgIcon(ViewIcon);
const IcoEyeOff = hgIcon(ViewOffSlashIcon);
const IcoPen = hgIcon(Edit02Icon);

interface ContactRow {
  id: number;
  name: string;
  email: string | null;
  type: string;
}

// Module tree — mirrors the prototype's WS_MODULES with finance submenus.
// Stored verbatim on the collaborator's permissions jsonb (the backend
// currently enforces top-level keys like "finances"/"rsvp"; the children
// are persisted for future granular checks).
type PermLevel = "none" | "view" | "edit";
type Permissions = Record<string, PermLevel>;

interface ModuleDef {
  key: string;
  label: string;
  levels: PermLevel[];
  children?: ModuleDef[];
}

const MODULES: ModuleDef[] = [
  { key: "general", label: "Dashboard", levels: ["none", "view", "edit"] },
  { key: "calendar", label: "Calendario", levels: ["none", "view", "edit"] },
  { key: "tasks", label: "Tareas", levels: ["none", "view", "edit"] },
  { key: "partners", label: "Partners", levels: ["none", "view"] },
  {
    key: "finances",
    label: "Finanzas",
    levels: ["none", "view", "edit"],
    children: [
      { key: "finance-invoices", label: "Facturas", levels: ["none", "view", "edit"] },
      { key: "finance-quotes", label: "Presupuestos", levels: ["none", "view", "edit"] },
      { key: "finance-payments", label: "Pagos", levels: ["none", "view", "edit"] },
      { key: "finance-deliveries", label: "Albaranes", levels: ["none", "view", "edit"] },
    ],
  },
  { key: "logistics", label: "Logística", levels: ["none", "view", "edit"] },
  { key: "rsvp", label: "RSVP", levels: ["none", "view", "edit"] },
  { key: "guests", label: "Lista de invitados", levels: ["none", "view", "edit"] },
  { key: "runsheet", label: "Orden del día", levels: ["none", "view", "edit"] },
  { key: "settings", label: "Configuración", levels: ["none", "view", "edit"] },
];

// Flat list of every module key (including children) — used to build presets.
const ALL_MODULE_KEYS: { key: string; levels: PermLevel[] }[] = MODULES.flatMap(
  (m) => [
    { key: m.key, levels: m.levels },
    ...(m.children ?? []).map((c) => ({ key: c.key, levels: c.levels })),
  ],
);

const DEFAULT_PERMS: Permissions = Object.fromEntries(
  ALL_MODULE_KEYS.map((m) => [m.key, "view" as PermLevel]),
);

function makePerms(level: PermLevel): Permissions {
  const out: Permissions = {};
  for (const m of ALL_MODULE_KEYS) {
    out[m.key] = m.levels.includes(level) ? level : "view";
  }
  return out;
}

/**
 * "Añadir colaborador" drawer — mirrors the prototype's CollabDrawer.
 *
 * One unified panel where you:
 *   1. Pick a contact (existing) or fill a new one (Nombre + Email)
 *   2. Apply a quick preset (Solo lectura / Colaborador completo)
 *   3. Tweak per-module permissions (Oculto / Solo ver / Editar)
 * Submitting creates the contact if needed, registers the collaborator with
 * the configured permissions, and triggers the auto-invite email.
 */
export function AddCollaboratorModal({
  open,
  onClose,
  eventId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  eventId: number;
  onSuccess: () => void;
}) {
  // Mode + person data
  const [mode, setMode] = useState<"pick" | "new">("pick");
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  // Picker dropdown state
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerWrapRef = useRef<HTMLDivElement>(null);

  // Permissions
  const [perms, setPerms] = useState<Permissions>(DEFAULT_PERMS);

  const [submitting, setSubmitting] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setMode("pick");
      setSelectedContact(null);
      setName("");
      setEmail("");
      setRole("");
      setPickerSearch("");
      setPickerOpen(false);
      setPerms(DEFAULT_PERMS);
      setSubmitting(false);
    }
  }, [open]);

  // Fetch contacts when picker is in use
  useEffect(() => {
    if (!open || mode !== "pick") return;
    let cancelled = false;
    setContactsLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "100",
          type: "person",
        });
        if (pickerSearch.trim()) params.set("search", pickerSearch.trim());
        const res = await fetch(`/api/contacts?${params.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success) setContacts((data.data?.data || []) as ContactRow[]);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setContactsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mode, pickerSearch]);

  // Click-outside closes picker
  useEffect(() => {
    if (!pickerOpen) return;
    const h = (e: MouseEvent) => {
      if (
        pickerWrapRef.current &&
        !pickerWrapRef.current.contains(e.target as Node)
      ) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [pickerOpen]);

  if (!open) return null;

  const pickContact = (c: ContactRow) => {
    setSelectedContact(c);
    setPickerOpen(false);
    setPickerSearch("");
  };
  const clearSelection = () => setSelectedContact(null);
  const switchToNew = () => {
    setMode("new");
    setSelectedContact(null);
    setPickerOpen(false);
    setName(pickerSearch);
  };
  const switchToPick = () => {
    setMode("pick");
    setName("");
    setEmail("");
  };

  const setPerm = (modKey: string, value: PermLevel) => {
    setPerms((p) => {
      const next: Permissions = { ...p, [modKey]: value };
      // Cascade: if a parent goes to "none", its children must also be "none"
      // so we don't end up with an inaccessible parent but accessible child.
      const parent = MODULES.find((m) => m.key === modKey);
      if (parent?.children && value === "none") {
        for (const ch of parent.children) next[ch.key] = "none";
      }
      return next;
    });
  };

  const validNew =
    mode === "new" &&
    name.trim().length > 0 &&
    /^\S+@\S+\.\S+$/.test(email);
  const valid = (mode === "pick" && !!selectedContact) || validNew;

  // Display values for the header avatar + name/email
  const headerName =
    mode === "pick"
      ? selectedContact?.name || "Nuevo colaborador"
      : name.trim() || "Nuevo colaborador";
  const headerEmail =
    mode === "pick"
      ? selectedContact?.email || ""
      : email.trim();
  const headerInitial = (headerName || "?").charAt(0).toUpperCase();

  async function handleSubmit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      let contactId: number;
      if (mode === "pick" && selectedContact) {
        contactId = selectedContact.id;
      } else {
        const trimmedName = name.trim();
        const [firstName, ...rest] = trimmedName.split(" ");
        const lastName = rest.join(" ").trim() || null;
        const contactRes = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "person",
            name: trimmedName,
            firstName,
            lastName,
            email: email.trim(),
            forceDuplicate: true,
          }),
        });
        const contactData = await contactRes.json();
        if (!contactData.success) {
          throw new Error(
            contactData.error?.message || "No se pudo crear el contacto",
          );
        }
        contactId = contactData.data?.id;
        if (!contactId) throw new Error("Contacto sin id");
      }

      const partRes = await fetch(`/api/events/${eventId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          type: "contact",
          role: role.trim() || undefined,
          permissions: perms,
        }),
      });
      const partData = await partRes.json();
      if (!partData.success) {
        throw new Error(
          partData.error?.message || "No se pudo añadir el colaborador",
        );
      }

      toast.success(
        mode === "pick" ? "Colaborador añadido" : "Invitación enviada",
      );
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al invitar";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    height: 36,
    boxSizing: "border-box",
    border: "1px solid var(--line-1)",
    borderRadius: 8,
    background: "#FFFFFF",
    color: "var(--ink-1)",
    fontSize: 13,
    outline: "none",
  };
  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--ink-3)",
    marginBottom: 10,
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,18,12,0.4)",
        zIndex: 100,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(540px, 96vw)",
          background: "#FFFFFF",
          boxShadow: "-20px 0 40px -10px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          borderLeft: "1px solid var(--line-1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start gap-3.5"
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--line-1)",
          }}
        >
          <div
            className="flex items-center justify-center text-white font-semibold flex-shrink-0"
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--ink-1)",
              fontSize: 18,
            }}
          >
            {headerInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-semibold text-[var(--ink-1)] truncate">
              {headerName}
            </div>
            <div className="text-[12.5px] text-[var(--ink-3)] mt-0.5">
              Añadir colaborador al evento
            </div>
            {headerEmail && (
              <div className="text-[12px] text-[var(--ink-3)] truncate">
                {headerEmail}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="cursor-pointer"
            style={{
              background: "none",
              border: "none",
              padding: 4,
              color: "var(--ink-3)",
              display: "flex",
            }}
          >
            <IcoX className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {/* Contact selector */}
          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid var(--line-1)",
            }}
          >
            <div style={sectionLabelStyle}>Persona</div>
            {mode === "pick" ? (
              <div className="flex flex-col gap-2.5">
                <div ref={pickerWrapRef} style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setPickerOpen((o) => !o)}
                    className="w-full inline-flex items-center justify-between cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]"
                    style={{
                      ...inputStyle,
                      textAlign: "left",
                      paddingRight: 32,
                    }}
                  >
                    {selectedContact ? (
                      <span className="inline-flex flex-col items-start min-w-0">
                        <span
                          className="text-[13px] font-medium truncate"
                          style={{ color: "var(--ink-1)" }}
                        >
                          {selectedContact.name}
                        </span>
                        <span
                          className="text-[11px] truncate"
                          style={{ color: "var(--ink-3)" }}
                        >
                          {selectedContact.email || "Sin email"}
                        </span>
                      </span>
                    ) : (
                      <span style={{ color: "var(--ink-3)" }}>
                        Selecciona un contacto…
                      </span>
                    )}
                    <span
                      style={{
                        color: "var(--ink-3)",
                        display: "flex",
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    >
                      <IcoChevDown className="h-3 w-3" />
                    </span>
                  </button>
                  {pickerOpen && (
                    <div
                      className="rounded-[8px]"
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        right: 0,
                        background: "#FFFFFF",
                        border: "1px solid var(--line-1)",
                        boxShadow: "0 6px 20px rgba(0,0,0,0.10)",
                        zIndex: 10,
                        padding: 6,
                      }}
                    >
                      <input
                        autoFocus
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        placeholder="Buscar por nombre o email…"
                        style={{
                          ...inputStyle,
                          height: 32,
                          fontSize: 12.5,
                          marginBottom: 6,
                        }}
                      />
                      <div
                        style={{
                          maxHeight: 220,
                          overflowY: "auto",
                          margin: "0 -2px",
                        }}
                      >
                        {contactsLoading && contacts.length === 0 ? (
                          <div
                            className="text-[12px]"
                            style={{
                              color: "var(--ink-3)",
                              padding: "10px",
                            }}
                          >
                            Cargando contactos…
                          </div>
                        ) : contacts.length === 0 ? (
                          <div
                            className="text-[12px]"
                            style={{
                              color: "var(--ink-3)",
                              padding: "10px",
                              lineHeight: 1.5,
                            }}
                          >
                            {pickerSearch.trim()
                              ? "Sin coincidencias."
                              : "No tienes contactos aún."}
                          </div>
                        ) : (
                          contacts.map((c) => {
                            const isSel = selectedContact?.id === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => pickContact(c)}
                                className="w-full text-left rounded-[6px] hover:bg-[var(--bg-subtle)] transition-colors"
                                style={{
                                  padding: "8px 10px",
                                  background: isSel
                                    ? "var(--bg-subtle)"
                                    : "none",
                                  border: "none",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <div
                                    className="text-[13px] font-medium truncate"
                                    style={{ color: "var(--ink-1)" }}
                                  >
                                    {c.name}
                                  </div>
                                  <div
                                    className="text-[11.5px] truncate"
                                    style={{ color: "var(--ink-3)" }}
                                  >
                                    {c.email || "Sin email"}
                                    {c.type === "company" ? " · empresa" : ""}
                                  </div>
                                </div>
                                {isSel && (
                                  <span
                                    style={{
                                      color: "#4F7A5E",
                                      display: "flex",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <IcoCheck className="h-3.5 w-3.5" />
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                      <div
                        style={{
                          borderTop: "1px solid var(--line-1)",
                          marginTop: 6,
                          paddingTop: 6,
                        }}
                      >
                        <button
                          type="button"
                          onClick={switchToNew}
                          className="w-full text-left rounded-[6px] cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors"
                          style={{
                            padding: "8px 10px",
                            background: "none",
                            border: "none",
                            color: "var(--ink-1)",
                            fontSize: 12.5,
                            fontWeight: 500,
                          }}
                        >
                          + Añadir alguien que no está en mis contactos
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {selectedContact && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="cursor-pointer underline self-start text-[11.5px]"
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--ink-3)",
                    }}
                  >
                    Quitar selección
                  </button>
                )}
                <Field label="Rol descriptivo">
                  <input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ej. Madre de la novia"
                    style={inputStyle}
                  />
                </Field>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div
                  className="text-[11.5px] inline-flex items-center gap-2"
                  style={{ color: "var(--ink-3)" }}
                >
                  Persona nueva, fuera de tus contactos.
                  <button
                    type="button"
                    onClick={switchToPick}
                    className="cursor-pointer underline"
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--ink-2)",
                    }}
                  >
                    ← Volver a elegir contacto
                  </button>
                </div>
                <Field label="Nombre">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre completo"
                    style={inputStyle}
                    autoFocus
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Rol descriptivo">
                  <input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ej. Madre de la novia"
                    style={inputStyle}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Quick presets */}
          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid var(--line-1)",
            }}
          >
            <div style={sectionLabelStyle}>Presets rápidos</div>
            <div className="flex gap-2 flex-wrap items-center">
              <PresetBtn onClick={() => setPerms(makePerms("view"))}>
                Solo lectura total
              </PresetBtn>
              <PresetBtn onClick={() => setPerms(makePerms("edit"))}>
                Colaborador completo
              </PresetBtn>
              <span
                className="text-[12px]"
                style={{ color: "var(--ink-3)", alignSelf: "center" }}
              >
                o configura módulo a módulo ↓
              </span>
            </div>
          </div>

          {/* Per-module permissions */}
          <div style={{ padding: "18px 24px" }}>
            <div style={sectionLabelStyle}>Permisos por módulo</div>
            <div className="flex flex-col gap-1.5">
              {MODULES.map((m) => {
                const parentValue = perms[m.key] ?? "view";
                return (
                  <div key={m.key} className="flex flex-col gap-1.5">
                    <PermRow
                      label={m.label}
                      value={parentValue}
                      levels={m.levels}
                      onChange={(v) => setPerm(m.key, v)}
                    />
                    {m.children && parentValue !== "none" && (
                      <div
                        style={{
                          marginLeft: 16,
                          borderLeft: "1px solid var(--line-1)",
                          paddingLeft: 14,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {m.children.map((ch) => (
                          <PermRow
                            key={ch.key}
                            label={ch.label}
                            value={perms[ch.key] ?? "view"}
                            levels={ch.levels}
                            onChange={(v) => setPerm(ch.key, v)}
                            small
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex gap-2 items-center"
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--line-1)",
            background: "var(--bg-subtle)",
          }}
        >
          <div className="ml-auto flex gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--line-strong)",
                padding: "8px 14px",
                fontSize: 12.5,
                fontWeight: 500,
                color: "var(--ink-1)",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!valid || submitting}
              className="inline-flex items-center rounded-[8px] cursor-pointer transition-colors border-none"
              style={{
                background: "var(--ink-1)",
                color: "#FFFFFF",
                padding: "8px 14px",
                fontSize: 12.5,
                fontWeight: 600,
                opacity: !valid || submitting ? 0.5 : 1,
              }}
            >
              {submitting
                ? "Enviando..."
                : mode === "pick"
                  ? "Añadir colaborador"
                  : "Enviar invitación"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-medium text-[var(--ink-2)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function PresetBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--line-strong)",
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 500,
        color: "var(--ink-1)",
      }}
    >
      {children}
    </button>
  );
}

function PermRow({
  label,
  value,
  levels,
  onChange,
  small,
}: {
  label: string;
  value: PermLevel;
  levels: PermLevel[];
  onChange: (v: PermLevel) => void;
  small?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-[8px]"
      style={{
        padding: small ? "5px 10px" : "8px 10px",
        border: "1px solid var(--line-1)",
        background: "#FFFFFF",
      }}
    >
      <div
        className="flex-1"
        style={{
          fontSize: small ? 12.5 : 13,
          fontWeight: small ? 400 : 500,
          color: "var(--ink-1)",
        }}
      >
        {label}
      </div>
      <PermSegmented value={value} levels={levels} onChange={onChange} />
    </div>
  );
}

function PermSegmented({
  value,
  levels,
  onChange,
}: {
  value: PermLevel;
  levels: PermLevel[];
  onChange: (v: PermLevel) => void;
}) {
  const opts: { v: PermLevel; l: string; icon: React.ReactNode; activeColor: string }[] = [
    {
      v: "none",
      l: "Oculto",
      icon: <IcoEyeOff className="h-3 w-3" />,
      activeColor: "#8A8078",
    },
    {
      v: "view",
      l: "Solo ver",
      icon: <IcoEye className="h-3 w-3" />,
      activeColor: "#4F7A5E",
    },
    {
      v: "edit",
      l: "Editar",
      icon: <IcoPen className="h-3 w-3" />,
      activeColor: "#2F4A3A",
    },
  ];
  return (
    <div
      className="inline-flex"
      style={{
        background: "var(--bg-subtle)",
        borderRadius: 999,
        padding: 2,
        gap: 2,
      }}
    >
      {opts
        .filter((o) => levels.includes(o.v))
        .map((o) => {
          const active = value === o.v;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => onChange(o.v)}
              className="inline-flex items-center gap-1 cursor-pointer border-none"
              style={{
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: active ? 600 : 500,
                borderRadius: 999,
                background: active ? "#FFFFFF" : "transparent",
                color: active ? o.activeColor : "var(--ink-3)",
                boxShadow: active
                  ? "0 1px 2px rgba(0,0,0,0.06)"
                  : "none",
              }}
            >
              {o.icon}
              {o.l}
            </button>
          );
        })}
    </div>
  );
}
