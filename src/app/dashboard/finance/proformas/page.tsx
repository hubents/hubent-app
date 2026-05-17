"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { downloadDocumentPDF, downloadBulkDocumentsPDF } from "@/lib/pdf-download";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search01Icon,
  PlusSignIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  Tick01Icon,
  MoreVerticalIcon,
  PencilEdit02Icon,
  Copy01Icon,
  Delete01Icon,
  Exchange01Icon,
  MailSend01Icon,
  Cancel01Icon,
  EyeIcon,
  TruckIcon,
  Download01Icon,
  Calendar01Icon,
  HandCoinsIcon,
  CheckmarkCircle01Icon,
  FilterHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { hgIcon } from "@/components/ui/hg-icon";
import { toast } from "sonner";
import { format } from "date-fns";
import { DocumentDrawer } from "@/components/finance/document-drawer";
import { DocumentPreview } from "@/components/finance/document-preview";
import { NumericPagination } from "@/components/ui/numeric-pagination";
import { ScopeFilter, type ScopeValue } from "@/components/ui/scope-filter";
import { useUserSession } from "@/hooks/use-user-session";
import { getInitials as initials, avColor } from "@/lib/ui-utils";
import { appConfirm } from "@/lib/confirm";

const IcoSearch       = hgIcon(Search01Icon);
const IcoPlus         = hgIcon(PlusSignIcon);
const IcoFilter       = hgIcon(FilterHorizontalIcon);
const IcoChevDown     = hgIcon(ArrowDown01Icon);
const IcoChevUp       = hgIcon(ArrowUp01Icon);
const IcoSort         = hgIcon(ArrowUpDownIcon);
const IcoCheck        = hgIcon(Tick01Icon);
const IcoMore         = hgIcon(MoreVerticalIcon);
const IcoEdit         = hgIcon(PencilEdit02Icon);
const IcoCopy         = hgIcon(Copy01Icon);
const IcoTrash        = hgIcon(Delete01Icon);
const IcoExchange     = hgIcon(Exchange01Icon);
const IcoSend         = hgIcon(MailSend01Icon);
const IcoX            = hgIcon(Cancel01Icon);
const IcoEye          = hgIcon(EyeIcon);
const IcoTruck        = hgIcon(TruckIcon);
const IcoDownload     = hgIcon(Download01Icon);
const IcoCalendar     = hgIcon(Calendar01Icon);
const IcoHandCoins    = hgIcon(HandCoinsIcon);
const IcoCheckDouble  = hgIcon(CheckmarkCircle01Icon);

interface DocumentItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  total: string;
}

interface Proforma {
  id: number;
  type: string;
  number: string;
  status: string;
  contactId: number | null;
  vendorId: number | null;
  eventId: number | null;
  direction: string | null;
  issueDate: string;
  dueDate: string | null;
  validUntil: string | null;
  subtotal: string;
  taxAmount: string;
  total: string;
  paidAmount: string | null;
  currency: string;
  globalDiscount: string | null;
  globalDiscountType: string | null;
  notes: string | null;
  termsAndConditions: string | null;
  contactName: string | null;
  companyName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  vendorName: string | null;
  eventName: string | null;
  items: DocumentItem[];
}

const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  draft:     { bg: "#EDEAE3", fg: "#5B5649", label: "Borrador" },
  approved:  { bg: "#D4E7F0", fg: "#2F6A85", label: "Aprobada" },
  sent:      { bg: "#FCEFC9", fg: "#8A6A1A", label: "Pendiente" },
  paid:      { bg: "#D9ECD1", fg: "#1F6A3A", label: "Pagada" },
  cancelled: { bg: "#F8D4D4", fg: "#8B2A2A", label: "Cancelada" },
};

type StatusFilter = "all" | "draft" | "approved" | "sent" | "paid" | "cancelled";
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all",       label: "Todas" },
  { value: "draft",     label: "Borrador" },
  { value: "approved",  label: "Aprobada" },
  { value: "sent",      label: "Pendiente" },
  { value: "paid",      label: "Pagada" },
  { value: "cancelled", label: "Cancelada" },
];

export default function ProformasPage() {
  return (
    <Suspense>
      <ProformasContent />
    </Suspense>
  );
}

function ProformasContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { can } = useUserSession();

  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scope, setScope] = useState<ScopeValue>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  type SortKey = "client" | "issueDate" | "number" | "status" | "total";
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!datePickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
    };
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", handler); };
  }, [datePickerOpen]);

  const cycleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [drawerInitialData, setDrawerInitialData] = useState<Record<string, unknown> | undefined>(undefined);
  const [drawerType, setDrawerType] = useState<"proforma" | "invoice" | "delivery_note">("proforma");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Proforma | null>(null);

  useEffect(() => { fetchProformas(); }, [page, statusFilter, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      openNewDrawer();
      router.replace("/dashboard/finance/proformas");
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchProformas() {
    try {
      setFetchError(null);
      const params = new URLSearchParams({ type: "proforma", page: page.toString(), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (scope !== "all") params.set("scope", scope);
      if (searchTerm) params.set("search", searchTerm);
      const res = await fetch(`/api/finance/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProformas(data.data || []);
          setTotalPages(data.meta?.totalPages || 1);
        }
      } else {
        const data = await res.json().catch(() => null);
        const msg = data?.error?.message || `Error del servidor (${res.status})`;
        setFetchError(msg);
        toast.error(msg);
      }
    } catch {
      setFetchError("No se pudo conectar con el servidor");
      toast.error("Error al cargar proformas");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProforma(id: number) {
    if (!await appConfirm({ title: "Eliminar proforma", description: "Esta acción no se puede deshacer.", confirmLabel: "Eliminar", variant: "destructive" })) return;
    try {
      const res = await fetch(`/api/finance/documents/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Proforma eliminada"); fetchProformas(); }
      else { const d = await res.json().catch(() => null); toast.error(d?.error?.message || "Error al eliminar"); }
    } catch { toast.error("Error al eliminar"); }
  }

  async function fetchDocAndOpenDrawer(id: number, targetType: "proforma" | "invoice" | "delivery_note") {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const doc = data.data;
          const isDeliveryNote = targetType === "delivery_note";
          setDrawerInitialData({
            contactId: doc.contactId, vendorId: doc.vendorId, eventId: doc.eventId,
            notes: doc.notes,
            termsAndConditions: isDeliveryNote ? undefined : doc.termsAndConditions,
            globalDiscount: isDeliveryNote ? undefined : parseFloat(doc.globalDiscount || "0") || undefined,
            globalDiscountType: isDeliveryNote ? undefined : doc.globalDiscountType,
            paymentMethod: isDeliveryNote ? undefined : doc.paymentMethod,
            bankAccountId: isDeliveryNote ? undefined : doc.bankAccountId,
            items: doc.items?.map((item: Record<string, string>) => ({
              description: item.description,
              quantity: parseFloat(item.quantity),
              unitPrice: isDeliveryNote ? 0 : parseFloat(item.unitPrice),
              discount: isDeliveryNote ? 0 : parseFloat(item.discount || "0"),
              taxRate: isDeliveryNote ? 0 : parseFloat(item.taxRate ?? "21"),
              total: isDeliveryNote ? 0 : parseFloat(item.total),
            })),
          });
          setDrawerType(targetType);
          setEditingId(undefined);
          setDrawerOpen(true);
        }
      }
    } catch { toast.error("Error al cargar documento"); }
  }

  async function updateStatus(id: number, status: string) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Estado actualizado a ${STATUS_PILL[status]?.label || status}`);
        fetchProformas();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.error?.message || "Error al actualizar estado");
      }
    } catch { toast.error("Error al actualizar estado"); }
  }

  function openNewDrawer() {
    setEditingId(undefined); setDrawerInitialData(undefined); setDrawerType("proforma"); setDrawerOpen(true);
  }
  function openEditDrawer(id: number) {
    setEditingId(id); setDrawerInitialData(undefined); setDrawerType("proforma"); setDrawerOpen(true);
  }
  async function handleBulkDownload() {
    const docs = sortedProformas
      .filter((p) => selectedIds.has(p.id))
      .map((p) => ({ id: p.id, number: p.number || String(p.id) }));
    await downloadBulkDocumentsPDF(docs, `proformas-${docs.length}`);
  }

  async function openPreview(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) { setPreviewDoc(data.data); setPreviewOpen(true); }
      }
    } catch { toast.error("Error al cargar documento"); }
  }

  const formatCurrency = (amount: string, currency = "EUR") =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(parseFloat(amount || "0"));

  const getClientName = (doc: Proforma) =>
    doc.contactName ||
    doc.companyName ||
    (doc.personFirstName ? `${doc.personFirstName} ${doc.personLastName || ""}`.trim() : "") ||
    doc.vendorName ||
    "Sin cliente";

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedProformas.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedProformas.map((p) => p.id)));
  };

  const sortedProformas = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
    const base = proformas.filter((p) => {
      if (!p.issueDate) return true;
      const d = new Date(p.issueDate);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
    if (!sort) return base;
    const dir = sort.dir === "asc" ? 1 : -1;
    const valueOf = (p: Proforma): string | number => {
      switch (sort.key) {
        case "client":    return getClientName(p).toLowerCase();
        case "issueDate": return p.issueDate ? new Date(p.issueDate).getTime() : 0;
        case "number":    return p.number || "";
        case "status":    return p.status;
        case "total":     return parseFloat(p.total || "0");
      }
    };
    return [...base].sort((a, b) => {
      const va = valueOf(a), vb = valueOf(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [proformas, sort, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = useMemo(() => {
    const sum = (arr: Proforma[]) => arr.reduce((acc, p) => acc + parseFloat(p.total || "0"), 0);
    const total      = sum(proformas);
    const pagadas    = proformas.filter((p) => p.status === "paid");
    const pendientes = proformas.filter((p) => p.status === "sent" || p.status === "approved");
    const cancelled  = proformas.filter((p) => p.status === "cancelled");
    const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : "0%";
    return [
      { label: "Total emitido",  value: formatCurrency(String(total)),           delta: "",                    sub: "del listado" },
      { label: "Pagadas",        value: formatCurrency(String(sum(pagadas))),     delta: pct(sum(pagadas)),     sub: "del total" },
      { label: "Pendientes",     value: formatCurrency(String(sum(pendientes))),  delta: pct(sum(pendientes)),  sub: "del total" },
      { label: "Canceladas",     value: formatCurrency(String(sum(cancelled))),   delta: pct(sum(cancelled)),   sub: "del total" },
    ];
  }, [proformas]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-[72px] rounded-[12px] opacity-60" style={{ background: "var(--bg-subtle)" }} />
        <div className="h-[380px] rounded-[12px] opacity-40" style={{ background: "var(--bg-subtle)" }} />
      </div>
    );
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (!sort || sort.key !== k) return <IcoSort className="h-3 w-3 opacity-30" />;
    return sort.dir === "asc" ? <IcoChevUp className="h-3 w-3" /> : <IcoChevDown className="h-3 w-3" />;
  };

  return (
    <div className="flex flex-col gap-4">

      {/* ── KPI strip — connected cells ── */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 rounded-[12px] overflow-hidden"
        style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
      >
        {kpis.map((k, i) => (
          <div
            key={i}
            className="px-5 py-4"
            style={{ borderLeft: i > 0 ? "1px solid var(--line-1)" : "none" }}
          >
            <div className="text-[12px] text-[var(--ink-3)] font-medium mb-1.5">{k.label}</div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[22px] font-semibold text-[var(--ink-1)]" style={{ letterSpacing: "-0.02em" }}>
                {k.value}
              </span>
              {k.delta && (
                <span className="text-[11px] font-medium text-[var(--ink-3)]">{k.delta}</span>
              )}
              <span className="text-[10.5px] text-[var(--ink-3)]">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table card ── */}
      <div
        className="rounded-[12px] p-[18px]"
        style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
          {/* Search */}
          <div
            className="flex items-center gap-2 rounded-[8px]"
            style={{ background: "#FFFFFF", border: "1px solid var(--line-1)", padding: "8px 12px", width: 280 }}
          >
            <IcoSearch className="h-3.5 w-3.5 text-[var(--ink-3)] flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por número o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchProformas(); } }}
              className="flex-1 bg-transparent outline-none text-[13px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)]"
            />
          </div>

          <ScopeFilter value={scope} onChange={(v) => { setScope(v); setPage(1); }} />

          {/* Status dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors"
                style={{
                  border: "1px solid var(--line-1)",
                  background: statusFilter !== "all" ? "var(--bg-subtle)" : "#FFFFFF",
                  padding: "7px 12px",
                  fontSize: 13,
                  color: "var(--ink-1)",
                  fontWeight: 500,
                  outline: "none",
                }}
              >
                <IcoFilter className="h-3.5 w-3.5" style={{ color: "var(--ink-3)" }} />
                {statusFilter !== "all"
                  ? STATUS_OPTIONS.find(o => o.value === statusFilter)?.label
                  : "Estado"}
                <IcoChevDown className="h-3.5 w-3.5" style={{ color: "var(--ink-3)" }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" style={{ minWidth: 180 }}>
              {STATUS_OPTIONS.map((o) => (
                <DropdownMenuItem
                  key={o.value}
                  onClick={() => { setStatusFilter(o.value); setPage(1); }}
                  className="flex items-center justify-between"
                >
                  {o.label}
                  {statusFilter === o.value && <IcoCheck className="h-3.5 w-3.5 ml-4" style={{ color: "var(--ink-1)" }} />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date range */}
          <div ref={datePickerRef} style={{ position: "relative" }}>
            <button
              onClick={() => setDatePickerOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors"
              style={{ border: "1px solid var(--line-1)", background: "#FFFFFF", padding: "7px 12px", fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}
            >
              <IcoCalendar className="h-3.5 w-3.5" style={{ color: "var(--ink-3)" }} />
              {format(new Date(dateFrom), "dd/MM/yyyy")} — {format(new Date(dateTo), "dd/MM/yyyy")}
              <IcoChevDown className="h-3.5 w-3.5" style={{ color: "var(--ink-3)" }} />
            </button>
            {datePickerOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 240, background: "#FFFFFF", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", boxShadow: "0 8px 24px rgba(15,16,18,.08)", padding: 16, zIndex: 30, display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 500, color: "var(--ink-3)" }}>
                  Desde
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: "6px 10px", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--ink-1)", fontFamily: "inherit", outline: "none" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 500, color: "var(--ink-3)" }}>
                  Hasta
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: "6px 10px", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--ink-1)", fontFamily: "inherit", outline: "none" }} />
                </label>
              </div>
            )}
          </div>

          {/* Bulk download */}
          <button
            onClick={handleBulkDownload}
            disabled={selectedIds.size === 0}
            title={selectedIds.size > 0 ? `Descargar ${selectedIds.size} PDF` : "Selecciona documentos para descargar"}
            className="inline-flex items-center justify-center rounded-[8px] transition-colors"
            style={{ border: "1px solid var(--line-1)", background: "#FFFFFF", padding: "7px 10px", color: selectedIds.size > 0 ? "var(--ink-1)" : "var(--ink-3)", opacity: selectedIds.size === 0 ? 0.45 : 1, cursor: selectedIds.size === 0 ? "not-allowed" : "pointer" }}
          >
            <IcoDownload className="h-4 w-4" />
          </button>

          <div className="ml-auto">
            {can("finance:create") && (
              <button
                onClick={openNewDrawer}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-colors"
                style={{ background: "var(--ink-1)", color: "#FFFFFF", border: "1px solid var(--ink-1)" }}
              >
                <IcoPlus className="h-[14px] w-[14px]" />
                Nueva Proforma
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {fetchError ? (
          <div className="text-center py-10">
            <div className="text-[13px] font-medium mb-3" style={{ color: "#B8412D" }}>{fetchError}</div>
            <button
              onClick={fetchProformas}
              className="px-3 py-1.5 rounded-[7px] text-[12.5px] cursor-pointer"
              style={{ border: "1px solid var(--line-strong)", background: "#FFFFFF" }}
            >
              Reintentar
            </button>
          </div>
        ) : proformas.length === 0 ? (
          <div className="text-center py-14">
            <div className="text-[14px] font-semibold text-[var(--ink-1)] mb-1">No hay proformas</div>
            <div className="text-[12.5px] text-[var(--ink-3)] mb-4">
              {searchTerm ? "No se encontraron resultados para esa búsqueda" : "Crea tu primera proforma con el botón de arriba"}
            </div>
            {!searchTerm && can("finance:create") && (
              <button
                onClick={openNewDrawer}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer mx-auto"
                style={{ background: "var(--ink-1)", color: "#FFFFFF", border: "1px solid var(--ink-1)" }}
              >
                <IcoPlus className="h-[14px] w-[14px]" />
                Nueva Proforma
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={sortedProformas.length > 0 && selectedIds.size === sortedProformas.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th onClick={() => cycleSort("client")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">Cliente <SortIcon k="client" /></span>
                  </th>
                  <th onClick={() => cycleSort("issueDate")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">Fecha <SortIcon k="issueDate" /></span>
                  </th>
                  <th onClick={() => cycleSort("number")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">Número <SortIcon k="number" /></span>
                  </th>
                  <th>Pagado</th>
                  <th onClick={() => cycleSort("status")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">Estado <SortIcon k="status" /></span>
                  </th>
                  <th
                    onClick={() => cycleSort("total")}
                    style={{ cursor: "pointer", userSelect: "none", textAlign: "right" }}
                  >
                    <span className="inline-flex items-center gap-1 justify-end w-full">
                      <SortIcon k="total" /> Total
                    </span>
                  </th>
                  <th style={{ width: 44 }} />
                </tr>
              </thead>
              <tbody>
                {sortedProformas.map((doc) => {
                  const pill = STATUS_PILL[doc.status] || { bg: "var(--bg-subtle)", fg: "var(--ink-2)", label: doc.status };
                  const clientName = getClientName(doc);
                  const total = parseFloat(doc.total || "0");
                  const paid = parseFloat(doc.paidAmount || "0");
                  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
                  const isSelected = selectedIds.has(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => openPreview(doc.id)}
                      style={{ cursor: "pointer" }}
                      data-state={isSelected ? "selected" : undefined}
                    >
                      <td onClick={(e) => e.stopPropagation()} style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(doc.id)}
                        />
                      </td>
                      {/* Cliente */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex-shrink-0 flex items-center justify-center rounded-full text-white"
                            style={{ width: 30, height: 30, background: avColor(clientName), fontSize: 11, fontWeight: 600 }}
                          >
                            {initials(clientName)}
                          </div>
                          <span className="text-[13px] font-medium text-[var(--ink-1)]">{clientName}</span>
                        </div>
                      </td>
                      {/* Fecha */}
                      <td>
                        <span className="text-[13px] text-[var(--ink-2)]">
                          {doc.issueDate
                            ? format(new Date(doc.issueDate), "dd/MM/yyyy")
                            : "—"}
                        </span>
                      </td>
                      {/* Número */}
                      <td>
                        <span className="text-[13px] text-[var(--ink-2)] font-mono">{doc.number}</span>
                      </td>
                      {/* Pagado */}
                      <td>
                        {paid <= 0 ? (
                          <span className="text-[13px] text-[var(--ink-3)]">—</span>
                        ) : (
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "var(--line-1)" }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: "#1F6A3A" }}
                              />
                            </div>
                            <span className="text-[11.5px] text-[var(--ink-3)] whitespace-nowrap">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </td>
                      {/* Estado */}
                      <td>
                        <span
                          className="inline-flex items-center rounded-[999px] text-[11.5px] font-medium"
                          style={{ background: pill.bg, color: pill.fg, padding: "3px 10px" }}
                        >
                          {pill.label}
                        </span>
                      </td>
                      {/* Total */}
                      <td style={{ textAlign: "right" }}>
                        <span className="text-[13px] font-semibold text-[var(--ink-1)]">
                          {formatCurrency(doc.total, doc.currency)}
                        </span>
                      </td>
                      {/* Acciones */}
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="inline-flex items-center justify-center rounded-[6px] transition-colors hover:bg-[var(--bg-subtle)] cursor-pointer border-none bg-transparent"
                              style={{ width: 28, height: 28, color: "var(--ink-3)" }}
                            >
                              <IcoMore className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openPreview(doc.id)}>
                              <IcoEye className="mr-2 h-4 w-4" /> Vista previa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDrawer(doc.id)}>
                              <IcoEdit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>

                            {/* Status transitions */}
                            <DropdownMenuSeparator />
                            {doc.status === "draft" && (
                              <>
                                <DropdownMenuItem onClick={() => updateStatus(doc.id, "approved")}>
                                  <IcoCheckDouble className="mr-2 h-4 w-4" /> Aprobar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(doc.id, "sent")}>
                                  <IcoSend className="mr-2 h-4 w-4" /> Marcar como Pendiente
                                </DropdownMenuItem>
                              </>
                            )}
                            {doc.status === "approved" && (
                              <DropdownMenuItem onClick={() => updateStatus(doc.id, "sent")}>
                                <IcoSend className="mr-2 h-4 w-4" /> Marcar como Pendiente
                              </DropdownMenuItem>
                            )}
                            {doc.status === "sent" && (
                              <DropdownMenuItem onClick={() => updateStatus(doc.id, "paid")}>
                                <IcoHandCoins className="mr-2 h-4 w-4" /> Marcar como Pagada
                              </DropdownMenuItem>
                            )}
                            {(doc.status === "sent" || doc.status === "paid") && (
                              <>
                                <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(doc.id, "invoice")}>
                                  <IcoExchange className="mr-2 h-4 w-4" /> Convertir a Factura
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(doc.id, "delivery_note")}>
                                  <IcoTruck className="mr-2 h-4 w-4" /> Convertir a Albarán
                                </DropdownMenuItem>
                              </>
                            )}
                            {doc.status !== "paid" && doc.status !== "cancelled" && (
                              <DropdownMenuItem onClick={() => updateStatus(doc.id, "cancelled")}>
                                <IcoX className="mr-2 h-4 w-4" /> Cancelar
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(doc.id, "proforma")}>
                              <IcoCopy className="mr-2 h-4 w-4" /> Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadDocumentPDF(doc.id, `proforma-${doc.number}.pdf`)}>
                              <IcoDownload className="mr-2 h-4 w-4" /> Descargar PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => deleteProforma(doc.id)}>
                              <IcoTrash className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
      {totalPages > 1 && (
        <div className="flex justify-center">
          <NumericPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Drawers */}
      <DocumentDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) { setDrawerInitialData(undefined); setDrawerType("proforma"); }
        }}
        type={drawerType}
        documentId={editingId}
        initialData={drawerInitialData}
        onSuccess={fetchProformas}
        onDuplicate={() => { setDrawerOpen(false); if (editingId) fetchDocAndOpenDrawer(editingId, "proforma"); }}
        onConvert={(targetType) => {
          setDrawerOpen(false);
          if (editingId) fetchDocAndOpenDrawer(editingId, targetType as "proforma" | "invoice" | "delivery_note");
        }}
      />

      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDoc}
        onEdit={() => { setPreviewOpen(false); if (previewDoc) openEditDrawer(previewDoc.id); }}
        onRefresh={fetchProformas}
      />
    </div>
  );
}
