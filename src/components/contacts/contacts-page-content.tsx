"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Search01Icon,
  FilterIcon,
  ArrowDown01Icon,
  PlusSignIcon,
  Upload01Icon,
  Download01Icon,
  UserCircleIcon,
  Building01Icon,
  Store01Icon,
  Mail01Icon,
  CallIcon,
  WhatsappIcon,
  Delete01Icon,
  ArrowDataTransferHorizontalIcon,
  Tick01Icon,
  MoreVerticalIcon,
  Cancel01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { useContacts } from "@/hooks/use-contacts";
import type { Contact } from "@/types";
import { ContactDrawer } from "./contact-drawer";
import { NewContactDrawer } from "./new-contact-drawer";
import { ImportContactsDrawer } from "./import-contacts-drawer";
import { LinkContactDrawer } from "./link-contact-drawer";
import { CreateLeadDrawer } from "@/components/crm/create-lead-drawer";
import { ContactPreviewDrawer } from "./contact-preview-drawer";
import { NumericPagination } from "@/components/ui/numeric-pagination";
import { useUserSession } from "@/hooks/use-user-session";
import { Av } from "@/components/ui/ds";

const IcoSearch = hgIcon(Search01Icon);
const IcoFilter = hgIcon(FilterIcon);
const IcoChevDown = hgIcon(ArrowDown01Icon);
const IcoPlus = hgIcon(PlusSignIcon);
const IcoUpload = hgIcon(Upload01Icon);
const IcoDownload = hgIcon(Download01Icon);
const IcoUser = hgIcon(UserCircleIcon);
const IcoBuilding = hgIcon(Building01Icon);
const IcoStore = hgIcon(Store01Icon);
const IcoMail = hgIcon(Mail01Icon);
const IcoPhone = hgIcon(CallIcon);
const IcoWhatsApp = hgIcon(WhatsappIcon);
const IcoTrash = hgIcon(Delete01Icon);
const IcoLink = hgIcon(ArrowDataTransferHorizontalIcon);
const IcoCheck = hgIcon(Tick01Icon);
const IcoMore = hgIcon(MoreVerticalIcon);
const IcoX = hgIcon(Cancel01Icon);
const IcoSparkles = hgIcon(SparklesIcon);

type Segment = "all" | "vendors" | "companies" | "persons";

// Pill colors mirror the prototype's TYPE_PILL palette.
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

// KPI cell — connected strip pattern from CRM page.
function Kpi({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 first:pl-5 not-first:border-l border-[var(--line-1)]">
      <div className="flex items-center gap-1.5 text-[12.5px] text-[var(--ink-3)] font-medium mb-1.5">
        {icon}
        {label}
      </div>
      <div className="flex items-baseline gap-2.5">
        <span
          className="text-[26px] font-semibold text-[var(--ink-1)]"
          style={{ letterSpacing: "-0.02em" }}
        >
          {value}
        </span>
      </div>
      {sub && <div className="text-[12px] text-[var(--ink-3)] mt-0.5">{sub}</div>}
    </div>
  );
}

// Sort dropdown — same UX as the prototype's "Ordenar / etiqueta".
type SortKey = "default" | "name-az" | "name-za" | "city-az" | "type-az";
const SORT_LABELS: Record<SortKey, string> = {
  "default": "Ordenar por",
  "name-az": "Nombre A → Z",
  "name-za": "Nombre Z → A",
  "city-az": "Ciudad A → Z",
  "type-az": "Tipo",
};

function SortDropdown({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const id = setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [open]);

  const groups: { group: string; items: { v: SortKey; l: string }[] }[] = [
    { group: "Nombre", items: [{ v: "name-az", l: "A → Z" }, { v: "name-za", l: "Z → A" }] },
    { group: "Ciudad", items: [{ v: "city-az", l: "A → Z" }] },
    { group: "Tipo", items: [{ v: "type-az", l: "Tipo" }] },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
        style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
      >
        <IcoFilter className="h-[14px] w-[14px]" />
        <span>{SORT_LABELS[value]}</span>
        <IcoChevDown className="h-3 w-3 text-[var(--ink-3)]" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] min-w-[220px] rounded-[12px] p-1.5 z-50"
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--line-1)",
            boxShadow: "0 8px 28px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.05)",
          }}
        >
          {groups.map((g, gi) => (
            <div key={g.group} style={{ paddingTop: gi === 0 ? 0 : 6 }}>
              <div
                className="text-[10px] font-semibold uppercase text-[var(--ink-3)] px-2.5 pt-1.5 pb-1"
                style={{ letterSpacing: "0.06em" }}
              >
                {g.group}
              </div>
              {g.items.map((o) => (
                <button
                  key={o.v}
                  onClick={() => { onChange(o.v); setOpen(false); }}
                  className="w-full text-left px-2.5 py-2 text-[13px] text-[var(--ink-1)] cursor-pointer rounded-[6px] flex items-center border-none transition-colors"
                  style={{ background: value === o.v ? "var(--bg-subtle)" : "transparent" }}
                >
                  <span className="flex-1">{o.l}</span>
                  {value === o.v && <IcoCheck className="h-3 w-3" />}
                </button>
              ))}
            </div>
          ))}
          {value !== "default" && (
            <button
              onClick={() => { onChange("default"); setOpen(false); }}
              className="w-full text-left px-2.5 py-2 mt-1.5 text-[12px] text-[var(--ink-3)] cursor-pointer bg-transparent border-none"
              style={{ borderTop: "1px solid var(--line-1)" }}
            >
              Quitar ordenación
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Per-row "more" menu — replicates the prototype's contact-row dropdown.
function RowMenu({
  contact,
  canManage,
  onView,
  onCall,
  onWhatsApp,
  onEmail,
  onConvertLead,
  onLink,
  onDelete,
}: {
  contact: Contact;
  canManage: boolean;
  onView: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onConvertLead: () => void;
  onLink: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const id = setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [open]);

  const items: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; show: boolean }[] = [
    { icon: <IcoUser className="h-3.5 w-3.5" />, label: "Ver detalles", onClick: onView, show: true },
    { icon: <IcoPhone className="h-3.5 w-3.5" />, label: "Llamar", onClick: onCall, show: !!contact.phone },
    { icon: <IcoWhatsApp className="h-3.5 w-3.5" />, label: "WhatsApp", onClick: onWhatsApp, show: !!contact.phone },
    { icon: <IcoMail className="h-3.5 w-3.5" />, label: "Enviar email", onClick: onEmail, show: !!contact.email },
    { icon: <IcoStore className="h-3.5 w-3.5" />, label: "Convertir a Lead", onClick: onConvertLead, show: !contact.isLead },
    { icon: <IcoLink className="h-3.5 w-3.5" />, label: "Vincular a evento o tarea", onClick: onLink, show: true },
    { icon: <IcoTrash className="h-3.5 w-3.5" />, label: "Eliminar", onClick: onDelete, danger: true, show: canManage },
  ];

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center h-8 w-8 rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)] border-none bg-transparent"
        aria-label="Acciones"
      >
        <IcoMore className="h-[14px] w-[14px] text-[var(--ink-2)]" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] min-w-[200px] rounded-[12px] p-1.5 z-50"
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--line-1)",
            boxShadow: "0 8px 28px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.05)",
          }}
        >
          {items
            .filter((it) => it.show)
            .map((it, i) => (
              <button
                key={i}
                onClick={() => { it.onClick(); setOpen(false); }}
                className="w-full text-left px-2.5 py-2 text-[13px] cursor-pointer rounded-[6px] flex items-center gap-2 border-none bg-transparent transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ color: it.danger ? "var(--color-danger)" : "var(--ink-1)" }}
              >
                {it.icon}
                <span className="flex-1">{it.label}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export function ContactsPageContent() {
  const { can } = useUserSession();
  const canManage = can("crm:manage");
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [page, setPage] = useState(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContactId, setPreviewContactId] = useState<number | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("default");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Sync segment from `?segment=` query param on mount and when the URL changes.
  useEffect(() => {
    const urlSegment = searchParams.get("segment");
    if (urlSegment && ["vendors", "companies", "persons"].includes(urlSegment)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSegment(urlSegment as Segment);
    }
  }, [searchParams]);
  const [drawerMode, setDrawerMode] = useState<"view" | "create">("view");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedContactForLead, setSelectedContactForLead] = useState<Contact | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const getFilterParams = () => {
    switch (segment) {
      case "vendors":
        return { isVendor: true };
      case "companies":
        return { type: "company", isVendor: false };
      case "persons":
        return { type: "person", isVendor: false };
      default:
        return {};
    }
  };

  const { contacts, stats, loading, meta, refetch, deleteContact } = useContacts({
    page,
    search: search || undefined,
    ...getFilterParams(),
  });

  const getContactCategory = (contact: Contact): string | null => {
    if (contact.isVendor) return contact.vendorCategory;
    return contact.category;
  };

  const getContactIdDisplay = (contact: Contact): { value: string; label: string } | null => {
    if (contact.type === "company" && contact.taxId) return { value: contact.taxId, label: "CIF" };
    if (contact.nieOrCif) return { value: contact.nieOrCif, label: "NIE/DNI" };
    if (contact.passportId) return { value: contact.passportId, label: "Pasaporte" };
    if (contact.taxId) return { value: contact.taxId, label: "CIF" };
    return null;
  };

  const getContactAddress = (contact: Contact): string | null => {
    const parts = [contact.city, contact.country].filter(Boolean);
    if (parts.length === 0) return contact.address || null;
    return parts.join(", ");
  };

  const getContactTypeLabel = (contact: Contact): string => {
    if (contact.isVendor) return "Proveedor";
    if (contact.isLead) return "Lead";
    if (contact.type === "company") return "Empresa";
    return "Cliente";
  };

  const sortedContacts = useMemo(() => {
    const result = [...contacts];
    switch (sortKey) {
      case "name-az":
        result.sort((a, b) => a.name.localeCompare(b.name, "es"));
        break;
      case "name-za":
        result.sort((a, b) => b.name.localeCompare(a.name, "es"));
        break;
      case "city-az":
        result.sort((a, b) => (a.city || "").localeCompare(b.city || "", "es"));
        break;
      case "type-az":
        result.sort((a, b) => getContactTypeLabel(a).localeCompare(getContactTypeLabel(b), "es"));
        break;
    }
    return result;
  }, [contacts, sortKey]);

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedContacts.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selectedIds.size} contactos seleccionados?`)) return;
    for (const id of selectedIds) {
      await deleteContact(id);
    }
    setSelectedIds(new Set());
  };

  const handleBulkExport = () => {
    const selected = sortedContacts.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return;
    exportToCSV(selected);
  };

  // Clear the bulk selection whenever the underlying contact list changes
  // (filter / sort / pagination would otherwise leave stale ids selected).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds(new Set());
  }, [contacts]);

  const handleContactClick = (contactId: number) => {
    setPreviewContactId(contactId);
    setIsPreviewOpen(true);
  };

  const handleEditFromPreview = () => {
    setIsPreviewOpen(false);
    if (previewContactId) {
      setSelectedContactId(previewContactId);
      setDrawerMode("view");
      setIsDrawerOpen(true);
    }
  };

  const openCreateDrawer = () => {
    setSelectedContactId(null);
    setDrawerMode("create");
    setIsDrawerOpen(true);
  };

  const handleContactCreated = (newContactId: number) => {
    setSelectedContactId(newContactId);
    setDrawerMode("view");
    refetch();
  };

  const handleDrawerClose = (open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) setDrawerMode("view");
  };

  const handleQuickCall = (contact: Contact) => {
    if (!contact.phone) return;
    const fullPhone = `${contact.phoneCountryCode || ""}${contact.phone}`.replace(/\s/g, "");
    window.open(`tel:${fullPhone}`, "_self");
  };

  const handleQuickEmail = (contact: Contact) => {
    if (!contact.email) return;
    window.open(`mailto:${contact.email}`, "_self");
  };

  const handleQuickWhatsApp = (contact: Contact) => {
    if (!contact.phone) return;
    const fullPhone = `${contact.phoneCountryCode || ""}${contact.phone}`.replace(/\s/g, "").replace("+", "");
    window.open(`https://wa.me/${fullPhone}`, "_blank");
  };

  const handleLinkContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsLinkDialogOpen(true);
  };

  const handleConvertToLead = (contact: Contact) => {
    setSelectedContactForLead(contact);
    setIsLeadDialogOpen(true);
  };

  const handleDeleteContact = async (contactId: number) => {
    if (confirm("¿Estás seguro de eliminar este contacto?")) {
      await deleteContact(contactId);
    }
  };

  function exportToCSV(rows: Contact[]) {
    const headers = ["Tipo", "Nombre", "Email", "Teléfono", "Ciudad", "Categoría", "Es Proveedor", "Tags"];
    const csvRows = rows.map((c) => [
      c.type === "company" ? "Empresa" : "Persona",
      c.name,
      c.email || "",
      c.phone ? `${c.phoneCountryCode || ""} ${c.phone}` : "",
      c.city || "",
      getContactCategory(c) || "",
      c.isVendor ? "Sí" : "No",
      c.tags?.join(", ") || "",
    ]);
    const csv = [
      headers.join(","),
      ...csvRows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contactos_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const handleExportCSV = () => {
    if (contacts.length === 0) {
      alert("No hay contactos para exportar");
      return;
    }
    exportToCSV(contacts);
  };

  const segmentOptions: { k: Segment; label: string; icon: React.ReactNode }[] = [
    { k: "all", label: "Todos", icon: null },
    { k: "persons", label: "Persona", icon: <IcoUser className="h-3 w-3" /> },
    { k: "companies", label: "Empresa", icon: <IcoBuilding className="h-3 w-3" /> },
    { k: "vendors", label: "Proveedor", icon: <IcoStore className="h-3 w-3" /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip — connected, like CRM */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 rounded-[12px] overflow-hidden"
        style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
      >
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="px-5 py-4 first:pl-5 not-first:border-l border-[var(--line-1)]"
              >
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-7 w-12" />
              </div>
            ))}
          </>
        ) : (
          <>
            <Kpi
              label="Total contactos"
              value={stats.total}
              sub="todos los registros"
              icon={<IcoUser className="h-3.5 w-3.5" />}
            />
            <Kpi
              label="Personas"
              value={stats.persons}
              sub="contactos individuales"
              icon={<IcoUser className="h-3.5 w-3.5" />}
            />
            <Kpi
              label="Empresas"
              value={stats.companies}
              sub="organizaciones"
              icon={<IcoBuilding className="h-3.5 w-3.5" />}
            />
            <Kpi
              label="Proveedores"
              value={stats.vendors}
              sub="vinculados a partners"
              icon={<IcoStore className="h-3.5 w-3.5" />}
            />
          </>
        )}
      </div>

      {/* Card with toolbar + table */}
      <div
        className="rounded-[12px] p-[18px]"
        style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
      >
        {/* Toolbar — search + sort + actions */}
        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
          <div
            className="flex items-center gap-2 rounded-[8px]"
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--line-1)",
              padding: "8px 12px",
              width: 280,
            }}
          >
            <IcoSearch className="h-3.5 w-3.5 text-[var(--ink-3)]" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 bg-transparent outline-none text-[13px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)]"
            />
          </div>

          <SortDropdown value={sortKey} onChange={setSortKey} />

          <div className="ml-auto flex gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
            >
              <IcoDownload className="h-[14px] w-[14px]" />
              Exportar
            </button>
            {canManage && segment !== "vendors" && (
              <button
                onClick={() => setIsImportDialogOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
              >
                <IcoUpload className="h-[14px] w-[14px]" />
                Importar
              </button>
            )}
            {canManage && segment === "vendors" ? (
              <a
                href="/dashboard/partners"
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-colors no-underline"
                style={{
                  background: "var(--ink-1)",
                  color: "#FFFFFF",
                  border: "1px solid var(--ink-1)",
                }}
              >
                <IcoStore className="h-[14px] w-[14px]" />
                Ir a Partners
              </a>
            ) : canManage ? (
              <button
                onClick={openCreateDrawer}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-colors"
                style={{
                  background: "var(--color-primary)",
                  color: "#FFFFFF",
                  border: "1px solid var(--color-primary)",
                }}
              >
                <IcoPlus className="h-[14px] w-[14px]" />
                Nuevo contacto
              </button>
            ) : null}
          </div>
        </div>

        {/* Segment pills — sub-tabs row above the table */}
        <div className="flex items-center mb-3.5">
          <div
            className="inline-flex gap-1 rounded-[8px]"
            style={{ background: "var(--bg-subtle)", padding: 3 }}
          >
            {segmentOptions.map((opt) => {
              const active = segment === opt.k;
              return (
                <button
                  key={opt.k}
                  onClick={() => { setSegment(opt.k); setPage(1); }}
                  className="inline-flex items-center gap-1.5 rounded-[6px] cursor-pointer border-none transition-colors"
                  style={{
                    padding: "6px 12px",
                    background: active ? "#FFFFFF" : "transparent",
                    color: active ? "var(--ink-1)" : "var(--ink-3)",
                    fontWeight: active ? 600 : 500,
                    fontSize: 12.5,
                    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Vendor notice — same as the prototype: vendors are read-only here, created from Partners */}
        {segment === "vendors" && (
          <div
            className="flex items-center gap-2.5 mb-3.5 rounded-[8px]"
            style={{
              background: "#F7F1E6",
              border: "1px solid #E8D9B8",
              padding: "10px 14px",
            }}
          >
            <span className="flex-shrink-0" style={{ color: "#8A6B1E" }}>
              <IcoSparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-[12.5px] text-[var(--ink-2)]">
              Los proveedores no se crean aquí. Se añaden desde{" "}
              <a
                href="/dashboard/partners"
                className="font-semibold text-[var(--ink-1)] hover:underline"
              >
                Partners
              </a>{" "}
              marcándolos como favoritos.
            </span>
          </div>
        )}

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div
            className="flex items-center gap-3 mb-3 rounded-[8px]"
            style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--line-1)",
              padding: "8px 12px",
            }}
          >
            <span className="text-[12.5px] font-medium text-[var(--ink-1)]">
              {selectedIds.size} seleccionado{selectedIds.size > 1 ? "s" : ""}
            </span>
            <button
              onClick={handleBulkExport}
              className="inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1 text-[12px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)] border-none"
              style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
            >
              <IcoDownload className="h-3 w-3" />
              Exportar
            </button>
            {canManage && (
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1 text-[12px] font-medium cursor-pointer transition-colors border-none"
                style={{
                  background: "#FFFFFF",
                  color: "var(--color-danger)",
                  border: "1px solid #F2CFCC",
                }}
              >
                <IcoTrash className="h-3 w-3" />
                Eliminar
              </button>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1 text-[12px] text-[var(--ink-3)] cursor-pointer transition-colors border-none bg-transparent hover:bg-[var(--bg-hover)]"
            >
              <IcoX className="h-3 w-3" />
              Cancelar
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex flex-col gap-2.5 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : sortedContacts.length === 0 ? (
          <div className="text-center py-14">
            <IcoUser className="mx-auto h-10 w-10 text-[var(--ink-4)] mb-3" />
            <h3 className="text-[14px] font-semibold text-[var(--ink-1)] mb-1">
              No hay contactos
            </h3>
            <p className="text-[12.5px] text-[var(--ink-3)] mb-4">
              {search ? "No se encontraron contactos con esos filtros" : "Crea tu primer contacto para comenzar"}
            </p>
            {!search && canManage && (
              <button
                onClick={openCreateDrawer}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-colors mx-auto"
                style={{
                  background: "var(--color-primary)",
                  color: "#FFFFFF",
                  border: "1px solid var(--color-primary)",
                }}
              >
                <IcoPlus className="h-[14px] w-[14px]" />
                Nuevo contacto
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <Checkbox
                      checked={selectedIds.size === sortedContacts.length && sortedContacts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th>Contacto</th>
                  <th className="hidden md:table-cell">Título</th>
                  <th className="hidden lg:table-cell">Dirección</th>
                  <th className="hidden xl:table-cell">ID</th>
                  <th>Tipo</th>
                  <th style={{ width: 44 }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedContacts.map((contact) => {
                  const idDisplay = getContactIdDisplay(contact);
                  const address = getContactAddress(contact);
                  const typeLabel = getContactTypeLabel(contact);
                  const isSelected = selectedIds.has(contact.id);

                  return (
                    <tr
                      key={contact.id}
                      onClick={() => handleContactClick(contact.id)}
                      data-state={isSelected ? "selected" : undefined}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(contact.id)}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Av src={contact.avatar} name={contact.name} size={32} />
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-[var(--ink-1)] truncate">{contact.name}</div>
                            {contact.email && (
                              <div className="text-[11.5px] text-[var(--ink-3)] truncate">{contact.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell">
                        <div className="text-[13px] text-[var(--ink-2)]">
                          {getContactCategory(contact) || "—"}
                        </div>
                        {contact.phone && (
                          <div className="text-[11.5px] text-[var(--ink-3)] mt-0.5">
                            {contact.phoneCountryCode} {contact.phone}
                          </div>
                        )}
                      </td>
                      <td className="hidden lg:table-cell" style={{ color: "var(--ink-3)", fontSize: 12 }}>
                        {address || "—"}
                      </td>
                      <td className="hidden xl:table-cell" style={{ fontSize: 12 }}>
                        {idDisplay ? (
                          <>
                            <div style={{ color: "var(--ink-2)" }}>{idDisplay.value}</div>
                            <div style={{ color: "var(--ink-3)", fontSize: 11 }}>{idDisplay.label}</div>
                          </>
                        ) : (
                          <span style={{ color: "var(--ink-3)" }}>—</span>
                        )}
                      </td>
                      <td>
                        <TypePill value={typeLabel} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <RowMenu
                          contact={contact}
                          canManage={canManage}
                          onView={() => handleContactClick(contact.id)}
                          onCall={() => handleQuickCall(contact)}
                          onWhatsApp={() => handleQuickWhatsApp(contact)}
                          onEmail={() => handleQuickEmail(contact)}
                          onConvertLead={() => handleConvertToLead(contact)}
                          onLink={() => handleLinkContact(contact)}
                          onDelete={() => handleDeleteContact(contact.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] text-[var(--ink-3)]">
            Mostrando {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
          </p>
          <NumericPagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <ImportContactsDrawer
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={refetch}
      />

      <LinkContactDrawer
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        contact={selectedContact}
        onLinkComplete={refetch}
      />

      <CreateLeadDrawer
        open={isLeadDialogOpen}
        onOpenChange={setIsLeadDialogOpen}
        onLeadCreated={refetch}
        preselectedContact={selectedContactForLead || undefined}
      />

      <ContactPreviewDrawer
        contactId={previewContactId}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        onEdit={handleEditFromPreview}
      />

      <NewContactDrawer
        open={isDrawerOpen && drawerMode === "create"}
        onOpenChange={handleDrawerClose}
        presetSegment={segment}
        onContactCreated={handleContactCreated}
      />

      <ContactDrawer
        contactId={selectedContactId}
        open={isDrawerOpen && drawerMode === "view"}
        onOpenChange={handleDrawerClose}
        onContactDeleted={refetch}
        onContactUpdated={refetch}
        mode="view"
        onOpenRelatedContact={(relatedId) => {
          setSelectedContactId(relatedId);
          setDrawerMode("view");
        }}
      />
    </div>
  );
}
