"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { downloadDocumentPDF } from "@/lib/pdf-download";
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
  HandCoinsIcon,
  Coins01Icon,
  ArrowDataTransferHorizontalIcon,
  CheckmarkCircle01Icon,
  Invoice01Icon,
} from "@hugeicons/core-free-icons";
import { hgIcon } from "@/components/ui/hg-icon";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DocumentDrawer } from "@/components/finance/document-drawer";
import { DocumentPreview } from "@/components/finance/document-preview";
import { NumericPagination } from "@/components/ui/numeric-pagination";
import { PaymentDrawer } from "@/components/finance/payment-drawer";
import { ScopeFilter, type ScopeValue } from "@/components/ui/scope-filter";
import { useUserSession } from "@/hooks/use-user-session";
import { getInitials as initials, avColor } from "@/lib/ui-utils";

const IcoSearch       = hgIcon(Search01Icon);
const IcoPlus         = hgIcon(PlusSignIcon);
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
const IcoHandCoins    = hgIcon(HandCoinsIcon);
const IcoCoins        = hgIcon(Coins01Icon);
const IcoTransfer     = hgIcon(ArrowDataTransferHorizontalIcon);
const IcoCheckCircle  = hgIcon(CheckmarkCircle01Icon);
const IcoInvoice      = hgIcon(Invoice01Icon);

interface DocumentItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  total: string;
}

interface Invoice {
  id: number;
  type: string;
  number: string;
  status: string;
  companyId: number | null;
  personId: number | null;
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
  companyName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  contactName: string | null;
  vendorName: string | null;
  eventName: string | null;
  items: DocumentItem[];
}

// Status pill colours — invoice-specific palette (draft/sent/paid/partial/overdue/cancelled)
const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  draft:           { bg: "#EDEAE3", fg: "#5B5649", label: "Borrador" },
  sent:            { bg: "#F6D9BE", fg: "#A35A1F", label: "Pendiente" },
  approved:        { bg: "#D9ECD1", fg: "#1F6A3A", label: "Aceptada" },
  accepted:        { bg: "#D9ECD1", fg: "#1F6A3A", label: "Aceptada" },
  paid:            { bg: "#D9ECD1", fg: "#1F6A3A", label: "Pagada" },
  delivered:       { bg: "#D9ECD1", fg: "#1F6A3A", label: "Entregada" },
  payment_promise: { bg: "#FCEFC9", fg: "#8A6A1A", label: "Promesa de pago" },
  partial:         { bg: "#D4E7F0", fg: "#2F6A85", label: "Parcial" },
  rejected:        { bg: "#F8D4D4", fg: "#8B2A2A", label: "Cancelada" },
  cancelled:       { bg: "#F8D4D4", fg: "#8B2A2A", label: "Cancelada" },
  overdue:         { bg: "#F8D4D4", fg: "#8B2A2A", label: "Vencida" },
};

type StatusFilter = "all" | "draft" | "sent" | "partial" | "paid" | "overdue" | "cancelled";
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all",       label: "Todas" },
  { value: "draft",     label: "Borrador" },
  { value: "sent",      label: "Pendiente" },
  { value: "partial",   label: "Parcial" },
  { value: "paid",      label: "Pagada" },
  { value: "overdue",   label: "Vencida" },
  { value: "cancelled", label: "Cancelada" },
];

export default function InvoicesPage() {
  return (
    <Suspense>
      <InvoicesContent />
    </Suspense>
  );
}

function InvoicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { can } = useUserSession();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scope, setScope] = useState<ScopeValue>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Sort
  type SortKey = "client" | "issueDate" | "number" | "paid" | "status" | "total";
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const cycleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [drawerInitialData, setDrawerInitialData] = useState<Record<string, unknown> | undefined>(undefined);
  const [drawerType, setDrawerType] = useState<"invoice" | "delivery_note">("invoice");

  // Payment drawer
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  useEffect(() => { fetchInvoices(); }, [page, statusFilter, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      openNewDrawer();
      router.replace("/dashboard/finance/invoices");
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchInvoices() {
    try {
      setFetchError(null);
      const params = new URLSearchParams({ type: "invoice", page: page.toString(), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (scope !== "all") params.set("scope", scope);
      if (searchTerm) params.set("search", searchTerm);
      const res = await fetch(`/api/finance/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setInvoices(data.data || []);
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
      toast.error("Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  }

  async function deleteInvoice(id: number) {
    if (!confirm("¿Estás seguro de eliminar esta factura?")) return;
    try {
      const res = await fetch(`/api/finance/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Factura eliminada");
        fetchInvoices();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al eliminar");
      }
    } catch {
      toast.error("Error al eliminar");
    }
  }

  async function fetchDocAndOpenDrawer(id: number, targetType: "invoice" | "delivery_note") {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const doc = data.data;
          const isDeliveryNote = targetType === "delivery_note";
          setDrawerInitialData({
            contactId: doc.contactId,
            vendorId: doc.vendorId,
            eventId: doc.eventId,
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
    } catch {
      toast.error("Error al cargar documento");
    }
  }

  async function createCreditNote(id: number) {
    if (
      !confirm(
        "¿Convertir en factura rectificativa? Se creará una rectificativa con importes negativos que anula la factura original. La encontrarás en Finanzas → Rectificativas.",
      )
    )
      return;
    try {
      const res = await fetch(`/api/finance/documents/${id}/credit-note`, { method: "POST" });
      if (res.ok) {
        toast.success("Factura rectificativa creada · Disponible en Rectificativas");
        fetchInvoices();
      } else {
        const error = await res.json();
        toast.error(error.error?.message || "Error al crear factura rectificativa");
      }
    } catch {
      toast.error("Error al crear factura rectificativa");
    }
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
        fetchInvoices();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al actualizar estado");
      }
    } catch {
      toast.error("Error al actualizar estado");
    }
  }

  async function generatePaymentLink(invoice: Invoice) {
    try {
      const res = await fetch("/api/finance/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: invoice.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await navigator.clipboard.writeText(data.data.checkoutUrl);
        toast.success("Link de pago copiado al portapapeles");
        fetchInvoices();
      } else {
        toast.error(data.error?.message || "Error al generar link de pago");
      }
    } catch {
      toast.error("Error al generar link de pago");
    }
  }

  function openNewDrawer() {
    setEditingId(undefined);
    setDrawerInitialData(undefined);
    setDrawerType("invoice");
    setDrawerOpen(true);
  }

  function openEditDrawer(id: number) {
    setEditingId(id);
    setDrawerInitialData(undefined);
    setDrawerType("invoice");
    setDrawerOpen(true);
  }

  function openPaymentDialog(invoice: Invoice) {
    setPaymentInvoice(invoice);
    setPaymentDialogOpen(true);
  }

  async function openPreview(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setPreviewInvoice(data.data);
          setPreviewOpen(true);
        }
      }
    } catch {
      toast.error("Error al cargar documento");
    }
  }

  const formatCurrency = (amount: string, currency = "EUR") =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(parseFloat(amount || "0"));

  const getClientName = (i: Invoice) =>
    i.contactName ||
    i.companyName ||
    (i.personFirstName ? `${i.personFirstName} ${i.personLastName || ""}`.trim() : "") ||
    i.vendorName ||
    "Sin cliente";

  function isOverdue(invoice: Invoice): boolean {
    if (!invoice.dueDate) return false;
    if (invoice.status === "paid" || invoice.status === "cancelled") return false;
    return new Date(invoice.dueDate) < new Date();
  }

  function getDisplayStatus(invoice: Invoice): string {
    if (isOverdue(invoice)) return "overdue";
    return invoice.status;
  }

  const sortedInvoices = useMemo(() => {
    if (!sort) return invoices;
    const dir = sort.dir === "asc" ? 1 : -1;
    const valueOf = (i: Invoice): string | number => {
      switch (sort.key) {
        case "client":    return getClientName(i).toLowerCase();
        case "issueDate": return i.issueDate ? new Date(i.issueDate).getTime() : 0;
        case "number":    return i.number || "";
        case "paid":      return parseFloat(i.paidAmount || "0");
        case "status":    return getDisplayStatus(i);
        case "total":     return parseFloat(i.total || "0");
      }
    };
    return [...invoices].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [invoices, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = useMemo(() => {
    const sum = (arr: Invoice[]) => arr.reduce((acc, i) => acc + parseFloat(i.total || "0"), 0);
    const sumPaid = (arr: Invoice[]) => arr.reduce((acc, i) => acc + parseFloat(i.paidAmount || "0"), 0);
    const overdue = invoices.filter((i) => isOverdue(i));
    const paidAmount = sumPaid(invoices);
    const totalAmount = sum(invoices);
    const pendingAmount = totalAmount - paidAmount;
    const overdueAmount = sum(overdue);
    const pct = (n: number) => (totalAmount > 0 ? `${Math.round((n / totalAmount) * 100)}%` : "0%");
    return [
      { label: "Total facturado", value: formatCurrency(String(totalAmount)), delta: "",                   sub: "del listado" },
      { label: "Cobrado",         value: formatCurrency(String(paidAmount)),   delta: pct(paidAmount),     sub: "del total facturado" },
      { label: "Pendiente",       value: formatCurrency(String(pendingAmount)), delta: pct(pendingAmount), sub: "del total facturado" },
      { label: "Vencido",         value: formatCurrency(String(overdueAmount)), delta: pct(overdueAmount), sub: "del total facturado", isWarning: overdueAmount > 0 },
    ];
  }, [invoices]); // eslint-disable-line react-hooks/exhaustive-deps

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
              <span
                className="text-[22px] font-semibold"
                style={{ letterSpacing: "-0.02em", color: "var(--ink-1)" }}
              >
                {k.value}
              </span>
              {k.delta && (
                <span
                  className="text-[11px] font-medium"
                  style={{ color: k.isWarning ? "#B8412D" : "var(--ink-3)" }}
                >
                  {k.delta}
                </span>
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
            style={{ background: "#FFFFFF", border: "1px solid var(--line-1)", padding: "8px 12px", width: 300 }}
          >
            <IcoSearch className="h-3.5 w-3.5 text-[var(--ink-3)] flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por cliente, número, referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchInvoices(); } }}
              className="flex-1 bg-transparent outline-none text-[13px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)]"
            />
          </div>

          <ScopeFilter value={scope} onChange={(v) => { setScope(v); setPage(1); }} />

          <div className="ml-auto">
            {can("finance:create") && (
              <button
                onClick={openNewDrawer}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-colors"
                style={{ background: "var(--ink-1)", color: "#FFFFFF", border: "1px solid var(--ink-1)" }}
              >
                <IcoPlus className="h-[14px] w-[14px]" />
                Nueva Factura
              </button>
            )}
          </div>
        </div>

        {/* Status pill filters */}
        <div className="flex items-center mb-4">
          <div
            className="inline-flex gap-1 rounded-[8px]"
            style={{ background: "var(--bg-subtle)", padding: 3 }}
          >
            {STATUS_OPTIONS.map((o) => {
              const active = statusFilter === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => { setStatusFilter(o.value); setPage(1); }}
                  className="inline-flex items-center rounded-[6px] cursor-pointer border-none transition-colors"
                  style={{
                    padding: "5px 12px",
                    background: active ? "#FFFFFF" : "transparent",
                    color: active ? "var(--ink-1)" : "var(--ink-3)",
                    fontWeight: active ? 600 : 500,
                    fontSize: 12.5,
                    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table / Empty / Error */}
        {fetchError ? (
          <div className="text-center py-10">
            <div className="text-[13px] font-medium mb-3" style={{ color: "#B8412D" }}>{fetchError}</div>
            <button
              onClick={fetchInvoices}
              className="px-3 py-1.5 rounded-[7px] text-[12.5px] cursor-pointer"
              style={{ border: "1px solid var(--line-strong)", background: "#FFFFFF" }}
            >
              Reintentar
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-14">
            <div className="text-[14px] font-semibold text-[var(--ink-1)] mb-1">No hay facturas</div>
            <div className="text-[12.5px] text-[var(--ink-3)] mb-4">
              {searchTerm
                ? "No se encontraron resultados para esa búsqueda"
                : "Crea tu primera factura con el botón de arriba"}
            </div>
            {!searchTerm && can("finance:create") && (
              <button
                onClick={openNewDrawer}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer mx-auto"
                style={{ background: "var(--ink-1)", color: "#FFFFFF", border: "1px solid var(--ink-1)" }}
              >
                <IcoPlus className="h-[14px] w-[14px]" />
                Nueva Factura
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th onClick={() => cycleSort("client")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">Cliente <SortIcon k="client" /></span>
                  </th>
                  <th onClick={() => cycleSort("number")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">Número <SortIcon k="number" /></span>
                  </th>
                  <th onClick={() => cycleSort("issueDate")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">Fecha <SortIcon k="issueDate" /></span>
                  </th>
                  <th onClick={() => cycleSort("paid")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">Pagado <SortIcon k="paid" /></span>
                  </th>
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
                {sortedInvoices.map((invoice) => {
                  const displayStatus = getDisplayStatus(invoice);
                  const pill = STATUS_PILL[displayStatus] || {
                    bg: "var(--bg-subtle)",
                    fg: "var(--ink-2)",
                    label: invoice.status,
                  };
                  const paid = parseFloat(invoice.paidAmount || "0");
                  const clientName = getClientName(invoice);

                  return (
                    <tr
                      key={invoice.id}
                      onClick={() => openPreview(invoice.id)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Cliente */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-semibold"
                            style={{ width: 30, height: 30, background: avColor(clientName), fontSize: 11 }}
                          >
                            {initials(clientName)}
                          </div>
                          <span className="text-[13px] font-medium text-[var(--ink-1)]">{clientName}</span>
                        </div>
                      </td>
                      {/* Número */}
                      <td>
                        <span className="text-[13px] text-[var(--ink-2)] font-mono">{invoice.number}</span>
                      </td>
                      {/* Fecha */}
                      <td>
                        <span className="text-[13px] text-[var(--ink-2)]">
                          {invoice.issueDate
                            ? format(new Date(invoice.issueDate), "d MMM yyyy", { locale: es })
                            : "—"}
                        </span>
                      </td>
                      {/* Pagado */}
                      <td>
                        <span className="text-[13px] text-[var(--ink-3)]">
                          {paid > 0 ? formatCurrency(invoice.paidAmount || "0", invoice.currency) : "—"}
                        </span>
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
                          {formatCurrency(invoice.total, invoice.currency)}
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
                            <DropdownMenuItem onClick={() => openPreview(invoice.id)}>
                              <IcoEye className="mr-2 h-4 w-4" /> Vista previa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDrawer(invoice.id)}>
                              <IcoEdit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>

                            {/* Payment actions — shown for unpaid/partial/overdue */}
                            {(invoice.status === "sent" ||
                              invoice.status === "draft" ||
                              invoice.status === "partial" ||
                              displayStatus === "overdue") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openPaymentDialog(invoice)}>
                                  <IcoHandCoins className="mr-2 h-4 w-4" /> Registrar Pago
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => generatePaymentLink(invoice)}>
                                  <IcoCoins className="mr-2 h-4 w-4" /> Generar Link de Pago
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(invoice.id, "paid")}>
                                  <IcoCheckCircle className="mr-2 h-4 w-4" /> Marcar como Pagada
                                </DropdownMenuItem>
                              </>
                            )}

                            {/* Reactivate cancelled */}
                            {(invoice.status === "cancelled" || invoice.status === "rejected") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => updateStatus(invoice.id, "sent")}>
                                  <IcoSend className="mr-2 h-4 w-4" /> Reactivar
                                </DropdownMenuItem>
                              </>
                            )}

                            {/* Conversions */}
                            {invoice.status !== "cancelled" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(invoice.id, "delivery_note")}>
                                  <IcoTruck className="mr-2 h-4 w-4" /> Convertir a Albarán
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => createCreditNote(invoice.id)}>
                                  <IcoTransfer className="mr-2 h-4 w-4" /> Convertir en factura rectificativa
                                </DropdownMenuItem>
                              </>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(invoice.id, "invoice")}>
                              <IcoCopy className="mr-2 h-4 w-4" /> Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => downloadDocumentPDF(invoice.id, `invoice-${invoice.number}.pdf`)}
                            >
                              <IcoDownload className="mr-2 h-4 w-4" /> Descargar PDF
                            </DropdownMenuItem>

                            {/* Delete only for draft/sent */}
                            {(invoice.status === "draft" || invoice.status === "sent") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => deleteInvoice(invoice.id)}>
                                  <IcoTrash className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
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

      {/* Payment Drawer */}
      <PaymentDrawer
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSuccess={fetchInvoices}
        documentId={paymentInvoice?.id}
        document={
          paymentInvoice
            ? {
                number: paymentInvoice.number,
                total: paymentInvoice.total,
                paidAmount: paymentInvoice.paidAmount || "0",
                currency: paymentInvoice.currency,
                direction: paymentInvoice.direction,
              }
            : undefined
        }
        showDirectionSelector={false}
      />

      {/* Document Drawer */}
      <DocumentDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setDrawerInitialData(undefined);
            setDrawerType("invoice");
          }
        }}
        type={drawerType}
        documentId={editingId}
        initialData={drawerInitialData}
        onSuccess={fetchInvoices}
        onDuplicate={() => {
          setDrawerOpen(false);
          if (editingId) fetchDocAndOpenDrawer(editingId, "invoice");
        }}
        onConvert={(targetType) => {
          setDrawerOpen(false);
          if (editingId)
            fetchDocAndOpenDrawer(editingId, targetType as "invoice" | "delivery_note");
        }}
      />

      {/* Document Preview */}
      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewInvoice}
        onEdit={() => {
          setPreviewOpen(false);
          if (previewInvoice) openEditDrawer(previewInvoice.id);
        }}
        onRefresh={fetchInvoices}
      />
    </div>
  );
}
