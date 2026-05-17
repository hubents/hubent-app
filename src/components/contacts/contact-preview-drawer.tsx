"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Cancel01Icon,
  Building01Icon,
  UserCircleIcon,
  PlusSignIcon,
  Tick01Icon,
  CheckmarkCircle02Icon,
  Folder01Icon,
  BankIcon,
  Clock01Icon,
  Mail01Icon,
  CallIcon,
  Note01Icon,
  Calendar03Icon,
} from "@hugeicons/core-free-icons";
import { useContactDetail } from "@/hooks/use-contact-detail";
import { Av } from "@/components/ui/ds";

const IcoX = hgIcon(Cancel01Icon);
const IcoBuilding = hgIcon(Building01Icon);
const IcoUser = hgIcon(UserCircleIcon);
const IcoPlus = hgIcon(PlusSignIcon);
const IcoCheck = hgIcon(Tick01Icon);
const IcoCheckCircle = hgIcon(CheckmarkCircle02Icon);
const IcoFolder = hgIcon(Folder01Icon);
const IcoBank = hgIcon(BankIcon);
const IcoClock = hgIcon(Clock01Icon);
const IcoMail = hgIcon(Mail01Icon);
const IcoPhone = hgIcon(CallIcon);
const IcoNote = hgIcon(Note01Icon);
const IcoCalendar = hgIcon(Calendar03Icon);

type TabKey = "detalles" | "archivos" | "pago" | "actividad";

const TYPE_PILL: Record<string, { bg: string; fg: string; dot: string }> = {
  Cliente:   { bg: "#EAE6F5", fg: "#5B3BA2", dot: "#8B6BC9" },
  Lead:      { bg: "#FFF2D1", fg: "#8A6B1E", dot: "#D6A937" },
  Proveedor: { bg: "#FBEADB", fg: "#A65B1E", dot: "#E89C6B" },
  Empresa:   { bg: "#F8D7D4", fg: "#9A3A33", dot: "#C97A7A" },
  Persona:   { bg: "#DCE8F5", fg: "#1F4A87", dot: "#5B8FE8" },
};

function TypePill({ value }: { value: string }) {
  const s = TYPE_PILL[value] || { bg: "var(--bg-subtle)", fg: "var(--ink-2)", dot: "var(--ink-4)" };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[999px] text-[11.5px] font-medium"
      style={{ background: s.bg, color: s.fg, padding: "3px 10px" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {value}
    </span>
  );
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <div
        className="text-[10.5px] font-semibold uppercase text-[var(--ink-4)]"
        style={{ letterSpacing: "0.06em" }}
      >
        {label}
      </div>
      <div className="text-[13px] text-[var(--ink-1)] leading-[1.4] whitespace-pre-line">
        {value}
      </div>
    </div>
  );
}

// ContactTodoList — local-state checklist mirroring the prototype's
// ContactTodoList. Items are seeded per-contact, persistence is local-only
// (matches the prototype, no API).
interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

function ContactTodoList({ contactId }: { contactId: number }) {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [input, setInput] = useState("");

  // Reset the local todo list when switching to a different contact.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems([
      { id: "t1", text: "Enviar presupuesto inicial", done: true },
      { id: "t2", text: "Confirmar fecha de reunión", done: false },
      { id: "t3", text: "Revisar contrato y firmar", done: false },
    ]);
    setInput("");
  }, [contactId]);

  const add = () => {
    const text = input.trim();
    if (!text) return;
    setItems((prev) => [...prev, { id: "t" + Date.now(), text, done: false }]);
    setInput("");
  };
  const toggle = (id: string) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  const remove = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  const done = items.filter((it) => it.done).length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <IcoCheckCircle className="h-3.5 w-3.5 text-[var(--ink-3)]" />
        <span
          className="text-[12px] font-semibold uppercase text-[var(--ink-2)]"
          style={{ letterSpacing: "0.06em" }}
        >
          To-Do
        </span>
        {total > 0 && (
          <span className="ml-auto text-[11.5px] text-[var(--ink-3)] font-medium">
            {done}/{total}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div
          className="h-1 rounded-[999px] overflow-hidden mb-3"
          style={{ background: "var(--bg-subtle)" }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${pct}%`, background: "var(--ink-1)" }}
          />
        </div>
      )}

      {/* Items */}
      <div className="flex flex-col gap-1.5 mb-2.5">
        {items.length === 0 && (
          <div className="text-center text-[12px] text-[var(--ink-4)] py-4">Sin tareas aún</div>
        )}
        {items.map((it) => (
          <div
            key={it.id}
            className="flex items-center gap-2.5 rounded-[8px]"
            style={{
              padding: "9px 10px",
              background: it.done ? "var(--bg-subtle)" : "#FFFFFF",
              border: "1px solid var(--line-1)",
            }}
          >
            <button
              onClick={() => toggle(it.id)}
              className="flex items-center justify-center cursor-pointer flex-shrink-0 p-0"
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                border: it.done
                  ? "1.5px solid var(--ink-1)"
                  : "1.5px solid var(--line-strong)",
                background: it.done ? "var(--ink-1)" : "#FFFFFF",
              }}
              aria-label={it.done ? "Marcar como pendiente" : "Marcar como hecha"}
            >
              {it.done && <IcoCheck className="h-2.5 w-2.5 text-white" />}
            </button>
            <span
              className="flex-1 text-[13px]"
              style={{
                color: it.done ? "var(--ink-3)" : "var(--ink-1)",
                textDecoration: it.done ? "line-through" : "none",
                textDecorationColor: "var(--ink-3)",
              }}
            >
              {it.text}
            </span>
            <button
              onClick={() => remove(it.id)}
              className="bg-transparent border-none cursor-pointer p-1 flex items-center transition-opacity opacity-60 hover:opacity-100"
              style={{ color: "var(--ink-4)" }}
              aria-label="Eliminar"
            >
              <IcoX className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* New item input */}
      <div className="flex gap-2">
        <input
          placeholder="Nueva tarea..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          className="flex-1 outline-none text-[13px]"
          style={{
            border: "1px solid var(--line-1)",
            borderRadius: 8,
            padding: "8px 12px",
            background: "#FFFFFF",
            color: "var(--ink-1)",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors border-none"
          style={{
            background: "var(--ink-1)",
            color: "#FFFFFF",
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <IcoPlus className="h-3 w-3" />
          Añadir
        </button>
      </div>
    </div>
  );
}

interface ContactPreviewDrawerProps {
  contactId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function ContactPreviewDrawer({
  contactId,
  open,
  onOpenChange,
  onEdit,
}: ContactPreviewDrawerProps) {
  const { contact, photos, documents, activities, loading, refetch } = useContactDetail(contactId);
  const [tab, setTab] = useState<TabKey>("detalles");

  // Reset the active tab whenever the drawer opens or the contact changes.
  useEffect(() => {
    if (open && contactId) {
      refetch();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab("detalles");
    }
  }, [open, contactId, refetch]);

  const getDisplayType = (): string => {
    if (!contact) return "Persona";
    if (contact.isVendor) return "Proveedor";
    if (contact.isLead) return "Lead";
    return contact.type === "company" ? "Empresa" : "Cliente";
  };

  const formatAddress = () => {
    if (!contact) return null;
    const parts = [contact.address, contact.city, contact.state, contact.postalCode].filter(Boolean);
    if (parts.length === 0) return null;
    return contact.country ? `${parts.join(", ")}, ${contact.country}` : parts.join(", ");
  };

  const getIdValue = (): { label: string; value: string } | null => {
    if (!contact) return null;
    if (contact.type === "company" && contact.taxId) return { label: "VAT", value: contact.taxId };
    if (contact.nieOrCif) return { label: "NIF / NIE", value: contact.nieOrCif };
    if (contact.taxId) return { label: "VAT", value: contact.taxId };
    return null;
  };

  const getCategory = (): string | null => {
    if (!contact) return null;
    if (contact.isVendor) return contact.vendorCategory;
    return contact.category;
  };

  const tabs: { id: TabKey; label: string }[] = [
    { id: "detalles", label: "Detalles" },
    { id: "archivos", label: "Archivos" },
    { id: "pago", label: "Información de pago" },
    { id: "actividad", label: "Actividad" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-hidden bg-white border-0 [&>button]:hidden flex flex-col"
        style={{ width: "min(420px, 100vw)", maxWidth: "100vw", padding: 0, gap: 0 }}
      >
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : contact ? (
          <>
            {/* Header */}
            <div className="flex items-start gap-3 px-6 pt-5 pb-3 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <div
                  className="text-[18px] font-semibold text-[var(--ink-1)]"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  Detalles del contacto
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="bg-transparent border-none cursor-pointer text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors"
                aria-label="Cerrar"
              >
                <IcoX className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* Tabs */}
            <div
              className="flex gap-[22px] px-6 pt-2 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--line-1)" }}
            >
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className="bg-transparent border-none cursor-pointer transition-colors"
                    style={{
                      padding: "8px 0",
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: active ? "var(--ink-1)" : "var(--ink-3)",
                      borderBottom: active ? "2px solid var(--ink-1)" : "2px solid transparent",
                      marginBottom: -1,
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6">
              {tab === "detalles" && (
                <div>
                  {/* Avatar + name + pill */}
                  <div
                    className="flex items-center gap-3.5"
                    style={{ padding: "20px 0 18px", borderBottom: "1px solid var(--line-1)" }}
                  >
                    <Av src={contact.avatar} name={contact.name} size={52} />
                    <div className="min-w-0">
                      <div
                        className="text-[16px] font-bold text-[var(--ink-1)] mb-1.5 truncate"
                        style={{ letterSpacing: "-0.01em" }}
                      >
                        {contact.name}
                      </div>
                      <TypePill value={getDisplayType()} />
                    </div>
                  </div>

                  {/* Email + Teléfono row */}
                  {(contact.email || contact.phone) && (
                    <div
                      className="grid grid-cols-2 gap-3.5"
                      style={{ padding: "12px 0", borderBottom: "1px solid var(--line-1)" }}
                    >
                      <InfoCell label="Email" value={contact.email} />
                      <InfoCell
                        label="Teléfono"
                        value={contact.phone ? `${contact.phoneCountryCode || ""} ${contact.phone}` : null}
                      />
                    </div>
                  )}

                  {/* Título + ID row */}
                  {(getCategory() || getIdValue()) && (
                    <div
                      className="grid grid-cols-2 gap-3.5"
                      style={{ padding: "12px 0", borderBottom: "1px solid var(--line-1)" }}
                    >
                      <InfoCell label="Título" value={getCategory()} />
                      {(() => {
                        const idv = getIdValue();
                        return idv ? <InfoCell label={idv.label} value={idv.value} /> : null;
                      })()}
                    </div>
                  )}

                  {/* Dirección */}
                  {formatAddress() && (
                    <div
                      style={{ padding: "12px 0", borderBottom: "1px solid var(--line-1)" }}
                    >
                      <InfoCell label="Dirección" value={formatAddress()} />
                    </div>
                  )}

                  {/* Notas */}
                  {contact.notes && (
                    <div
                      style={{ padding: "12px 0", borderBottom: "1px solid var(--line-1)" }}
                    >
                      <InfoCell label="Notas" value={contact.notes} />
                    </div>
                  )}

                  {/* TODO list */}
                  <div className="pt-1 pb-5">
                    <ContactTodoList contactId={contact.id} />
                  </div>
                </div>
              )}

              {tab === "archivos" && (
                <div className="py-5">
                  {photos.length === 0 && documents.length === 0 ? (
                    <div
                      className="text-center py-12 rounded-[8px]"
                      style={{ border: "2px dashed var(--line-1)" }}
                    >
                      <IcoFolder className="h-10 w-10 mx-auto text-[var(--ink-4)] mb-3" />
                      <p className="text-[12.5px] text-[var(--ink-3)]">
                        Sin archivos. Edita el contacto para subir fotos o documentos.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-3 rounded-[8px] p-3"
                          style={{ border: "1px solid var(--line-1)" }}
                        >
                          <div
                            className="h-9 w-9 rounded-[8px] flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                            style={{
                              background: doc.mimeType?.includes("pdf") ? "#FFE5E5" : "var(--bg-subtle)",
                              color: doc.mimeType?.includes("pdf") ? "#C33" : "var(--ink-2)",
                            }}
                          >
                            {doc.mimeType?.includes("pdf") ? "PDF" : "DOC"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[var(--ink-1)] truncate">
                              {doc.name}
                            </p>
                            {doc.uploadedAt && (
                              <p className="text-[11px] text-[var(--ink-3)]">
                                {new Date(doc.uploadedAt).toLocaleDateString("es-ES")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {photos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {photos.map((p) => (
                            <div
                              key={p.id}
                              className="aspect-square rounded-[8px] overflow-hidden"
                              style={{ border: "1px solid var(--line-1)" }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={p.thumbnail || p.url}
                                alt={p.caption || "Foto"}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tab === "pago" && (
                <div className="py-5 flex flex-col gap-3">
                  {contact.bankName || contact.bankIban || contact.bankSwift ? (
                    <div
                      className="rounded-[8px] p-3 flex flex-col gap-2"
                      style={{ background: "#FAFBFF", border: "1.5px solid #B5C9FF" }}
                    >
                      {contact.bankName && (
                        <div className="flex items-center gap-2">
                          <IcoBank className="h-3.5 w-3.5 text-[var(--ink-3)] flex-shrink-0" />
                          <InfoCell label="Banco" value={contact.bankName} />
                        </div>
                      )}
                      {contact.bankIban && <InfoCell label="IBAN" value={contact.bankIban} />}
                      {contact.bankSwift && <InfoCell label="SWIFT/BIC" value={contact.bankSwift} />}
                    </div>
                  ) : (
                    <div
                      className="text-center py-12 rounded-[8px]"
                      style={{ border: "2px dashed var(--line-1)" }}
                    >
                      <IcoBank className="h-10 w-10 mx-auto text-[var(--ink-4)] mb-3" />
                      <p className="text-[12.5px] text-[var(--ink-3)]">
                        Sin información de pago. Edita el contacto para añadirla.
                      </p>
                    </div>
                  )}
                  {contact.paymentMethods && contact.paymentMethods.length > 0 && (
                    <div>
                      <div
                        className="text-[10.5px] font-semibold uppercase text-[var(--ink-3)] mb-2"
                        style={{ letterSpacing: "0.08em" }}
                      >
                        Métodos de pago
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {contact.paymentMethods.map((m: string) => (
                          <span
                            key={m}
                            className="inline-flex items-center rounded-[999px] text-[11.5px] px-2.5 py-1"
                            style={{ background: "var(--bg-subtle)", color: "var(--ink-2)" }}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "actividad" && (
                <div className="py-5 flex flex-col gap-2.5">
                  {activities.length === 0 ? (
                    <div
                      className="text-center py-12 rounded-[8px]"
                      style={{ border: "2px dashed var(--line-1)" }}
                    >
                      <IcoClock className="h-10 w-10 mx-auto text-[var(--ink-4)] mb-3" />
                      <p className="text-[12.5px] text-[var(--ink-3)]">Sin actividades aún</p>
                    </div>
                  ) : (
                    activities.map((a) => {
                      const Icon =
                        a.type === "call"
                          ? IcoPhone
                          : a.type === "email"
                            ? IcoMail
                            : a.type === "meeting"
                              ? IcoCalendar
                              : IcoNote;
                      return (
                        <div key={a.id} className="flex items-start gap-2.5">
                          <div
                            className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: "var(--bg-subtle)", color: "var(--ink-2)" }}
                          >
                            <Icon className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[var(--ink-1)]">{a.title}</p>
                            {a.createdAt && (
                              <p className="text-[11px] text-[var(--ink-3)]">
                                {new Date(a.createdAt).toLocaleDateString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-6 py-3.5 flex gap-2.5 flex-shrink-0"
              style={{ borderTop: "1px solid var(--line-1)" }}
            >
              <button
                onClick={() => onOpenChange(false)}
                className="flex-1 inline-flex items-center justify-center rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                style={{
                  background: "#FFFFFF",
                  color: "var(--ink-1)",
                  border: "1px solid var(--line-strong)",
                  padding: "12px",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Cerrar
              </button>
              <button
                onClick={onEdit}
                className="flex-1 inline-flex items-center justify-center rounded-[8px] cursor-pointer transition-colors border-none"
                style={{
                  background: "var(--color-primary)",
                  color: "#FFFFFF",
                  padding: "12px",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Editar
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <IcoUser className="h-10 w-10 mx-auto text-[var(--ink-4)] mb-3" />
              <p className="text-[13px] text-[var(--ink-3)]">No se encontró el contacto</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
