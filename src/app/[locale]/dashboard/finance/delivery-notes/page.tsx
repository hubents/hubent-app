"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  Download01Icon,
  Calendar01Icon,
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

const IcoSearch      = hgIcon(Search01Icon);
const IcoPlus        = hgIcon(PlusSignIcon);
const IcoFilter      = hgIcon(FilterHorizontalIcon);
const IcoChevDown    = hgIcon(ArrowDown01Icon);
const IcoChevUp      = hgIcon(ArrowUp01Icon);
const IcoSort        = hgIcon(ArrowUpDownIcon);
const IcoCheck       = hgIcon(Tick01Icon);
const IcoMore        = hgIcon(MoreVerticalIcon);
const IcoEdit        = hgIcon(PencilEdit02Icon);
const IcoCopy        = hgIcon(Copy01Icon);
const IcoTrash       = hgIcon(Delete01Icon);
const IcoExchange    = hgIcon(Exchange01Icon);
const IcoSend        = hgIcon(MailSend01Icon);
const IcoX           = hgIcon(Cancel01Icon);
const IcoEye         = hgIcon(EyeIcon);
const IcoDownload    = hgIcon(Download01Icon);
const IcoCalendar    = hgIcon(Calendar01Icon);
const IcoCheckDouble = hgIcon(CheckmarkCircle01Icon);

interface DocumentItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  total: string;
}

interface DeliveryNote {
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

type StatusFilter = "all" | "draft" | "sent" | "approved" | "delivered";

export default function DeliveryNotesPage() {
  return (
    <Suspense>
      <DeliveryNotesContent />
    </Suspense>
  );
}

export function DeliveryNotesContent({
  basePath = "/dashboard/finance/delivery-notes",
}: {
  basePath?: string;
}) {
  const t = useTranslations("finance");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { can } = useUserSession();

  const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
    draft:     { bg: "#EDEAE3", fg: "#5B5649", label: t("deliveryNotes.statusDraft") },
    sent:      { bg: "#F6D9BE", fg: "#A35A1F", label: t("deliveryNotes.statusSent") },
    approved:  { bg: "#D4E7F0", fg: "#2F6A85", label: t("deliveryNotes.statusApproved") },
    delivered: { bg: "#D9ECD1", fg: "#1F6A3A", label: t("deliveryNotes.statusDelivered") },
    cancelled: { bg: "#F8D4D4", fg: "#8B2A2A", label: t("deliveryNotes.statusCancelled") },
  };

  const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "all",       label: t("filters.statusAll") },
    { value: "draft",     label: t("deliveryNotes.statusDraft") },
    { value: "sent",      label: t("deliveryNotes.statusSent") },
    { value: "approved",  label: t("deliveryNotes.statusApproved") },
    { value: "delivered", label: t("deliveryNotes.statusDelivered") },
  ];

  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scope, setScope] = useState<ScopeValue>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [drawerInitialData, setDrawerInitialData] = useState<Record<string, unknown> | undefined>(undefined);
  const [drawerType, setDrawerType] = useState<"delivery_note" | "invoice">("delivery_note");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewNote, setPreviewNote] = useState<DeliveryNote | null>(null);

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

  useEffect(() => { fetchNotes(); }, [statusFilter, page, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      openNewDrawer();
      router.replace(basePath);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchNotes() {
    try {
      setFetchError(null);
      const params = new URLSearchParams({ type: "delivery_note", page: page.toString(), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchTerm) params.set("search", searchTerm);
      if (scope !== "all") params.set("scope", scope);
      const res = await fetch(`/api/finance/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotes(data.data || []);
          setTotalPages(data.meta?.totalPages || 1);
        }
      } else {
        const data = await res.json().catch(() => null);
        const msg = data?.error?.message || `Error del servidor (${res.status})`;
        setFetchError(msg);
        toast.error(msg);
      }
    } catch {
      setFetchError(t("deliveryNotes.connectError"));
      toast.error(t("deliveryNotes.loadError"));
    } finally {
      setLoading(false);
    }
  }

  async function deleteNote(id: number) {
    if (!await appConfirm({ title: t("deliveryNotes.deleteTitle"), description: t("deliveryNotes.deleteDescription"), confirmLabel: t("deliveryNotes.deleteConfirm"), variant: "destructive" })) return;
    try {
      const res = await fetch(`/api/finance/documents/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success(t("deliveryNotes.deleted")); fetchNotes(); }
      else { const d = await res.json().catch(() => null); toast.error(d?.error?.message || t("deliveryNotes.deleteError")); }
    } catch { toast.error(t("deliveryNotes.deleteError")); }
  }

  async function fetchDocAndOpenDrawer(id: number, targetType: "delivery_note" | "invoice") {
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
              unitPrice: isDeliveryNote ? 0 : parseFloat(item.unitPrice || "0"),
              discount: isDeliveryNote ? 0 : parseFloat(item.discount || "0"),
              taxRate: isDeliveryNote ? 0 : parseFloat(item.taxRate ?? "21"),
              total: isDeliveryNote ? 0 : parseFloat(item.total || "0"),
            })),
          });
          setDrawerType(targetType);
          setEditingId(undefined);
          setDrawerOpen(true);
        }
      }
    } catch { toast.error(t("deliveryNotes.loadDocError")); }
  }

  async function updateStatus(id: number, status: string) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`${t("deliveryNotes.statusUpdated")} ${STATUS_PILL[status]?.label || status}`);
        fetchNotes();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.error?.message || t("deliveryNotes.statusError"));
      }
    } catch { toast.error(t("deliveryNotes.statusError")); }
  }

  function openNewDrawer() {
    setEditingId(undefined); setDrawerInitialData(undefined); setDrawerType("delivery_note"); setDrawerOpen(true);
  }
  function openEditDrawer(id: number) {
    setEditingId(id); setDrawerInitialData(undefined); setDrawerType("delivery_note"); setDrawerOpen(true);
  }
  async function handleBulkDownload() {
    const docs = sortedNotes
      .filter((n) => selectedIds.has(n.id))
      .map((n) => ({ id: n.id, number: n.number || String(n.id) }));
    await downloadBulkDocumentsPDF(docs, `albaranes-${docs.length}`);
  }

  async function openPreview(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) { setPreviewNote(data.data); setPreviewOpen(true); }
      }
    } catch { toast.error(t("deliveryNotes.loadDocError")); }
  }

  const getClientName = (n: DeliveryNote) =>
    n.contactName ||
    n.companyName ||
    (n.personFirstName ? `${n.personFirstName} ${n.personLastName || ""}`.trim() : "") ||
    n.vendorName ||
    t("table.noClient");

  const formatCurrency = (amount: string, currency = "EUR") =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(parseFloat(amount || "0"));

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedNotes.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedNotes.map((n) => n.id)));
  };

  const sortedNotes = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
    const base = notes.filter((n) => {
      if (!n.issueDate) return true;
      const d = new Date(n.issueDate);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
    if (!sort) return base;
    const dir = sort.dir === "asc" ? 1 : -1;
    const valueOf = (n: DeliveryNote): string | number => {
      switch (sort.key) {
        case "client":    return getClientName(n).toLowerCase();
        case "issueDate": return n.issueDate ? new Date(n.issueDate).getTime() : 0;
        case "number":    return n.number || "";
        case "status":    return n.status;
        case "total":     return parseFloat(n.total || "0");
      }
    };
    return [...base].sort((a, b) => {
      const va = valueOf(a), vb = valueOf(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [notes, sort, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = useMemo(() => {
    const total      = notes.length;
    const entregados = notes.filter((n) => n.status === "delivered").length;
    const pendientes = notes.filter((n) => n.status === "draft" || n.status === "sent").length;
    const aprobados  = notes.filter((n) => n.status === "approved").length;
    const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : "0%";
    return [
      { label: t("deliveryNotes.kpiTotal"),     value: String(total),       delta: "",               sub: t("deliveryNotes.kpiThisMonth") },
      { label: t("deliveryNotes.kpiDelivered"), value: String(entregados),  delta: pct(entregados),  sub: t("deliveryNotes.kpiOfTotal") },
      { label: t("deliveryNotes.kpiPending"),   value: String(pendientes),  delta: pct(pendientes),  sub: t("deliveryNotes.kpiOfTotal") },
      { label: t("deliveryNotes.kpiApproved"),  value: String(aprobados),   delta: pct(aprobados),   sub: t("deliveryNotes.kpiOfTotal") },
    ];
  }, [notes]); // eslint-disable-line react-hooks/exhaustive-deps

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
              placeholder={t("deliveryNotes.search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchNotes(); } }}
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
                <IcoFilter className="h-3.5 w-3.5" />
                {statusFilter !== "all"
                  ? STATUS_OPTIONS.find(o => o.value === statusFilter)?.label
                  : t("deliveryNotes.statusFilter")}
                <IcoChevDown className="h-3.5 w-3.5" />
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
              <IcoCalendar className="h-3.5 w-3.5" />
              {format(new Date(dateFrom), "dd/MM/yyyy")} — {format(new Date(dateTo), "dd/MM/yyyy")}
              <IcoChevDown className="h-3.5 w-3.5" />
            </button>
            {datePickerOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 240, background: "#FFFFFF", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", boxShadow: "0 8px 24px rgba(15,16,18,.08)", padding: 16, zIndex: 30, display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 500, color: "var(--ink-3)" }}>
                  {t("deliveryNotes.dateFrom")}
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: "6px 10px", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--ink-1)", fontFamily: "inherit", outline: "none" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 500, color: "var(--ink-3)" }}>
                  {t("deliveryNotes.dateTo")}
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: "6px 10px", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--ink-1)", fontFamily: "inherit", outline: "none" }} />
                </label>
              </div>
            )}
          </div>

          {/* Bulk download */}
          <button
            onClick={handleBulkDownload}
            disabled={selectedIds.size === 0}
            title={selectedIds.size > 0 ? t("deliveryNotes.downloadTitle", { count: selectedIds.size }) : t("deliveryNotes.downloadHint")}
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
                style={{ background: "var(--color-primary)", color: "#FFFFFF", border: "1px solid var(--color-primary)" }}
              >
                <IcoPlus className="h-[14px] w-[14px]" />
                {t("deliveryNotes.newButton")}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {fetchError ? (
          <div className="text-center py-10">
            <div className="text-[13px] font-medium mb-3" style={{ color: "#B8412D" }}>{fetchError}</div>
            <button
              onClick={fetchNotes}
              className="px-3 py-1.5 rounded-[7px] text-[12.5px] cursor-pointer"
              style={{ border: "1px solid var(--line-strong)", background: "#FFFFFF" }}
            >
              {t("deliveryNotes.retry")}
            </button>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-14">
            <div className="text-[14px] font-semibold text-[var(--ink-1)] mb-1">{t("deliveryNotes.empty")}</div>
            <div className="text-[12.5px] text-[var(--ink-3)] mb-4">
              {searchTerm ? t("deliveryNotes.emptySearch") : t("deliveryNotes.emptyCreate")}
            </div>
            {!searchTerm && can("finance:create") && (
              <button
                onClick={openNewDrawer}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer mx-auto"
                style={{ background: "var(--color-primary)", color: "#FFFFFF", border: "1px solid var(--color-primary)" }}
              >
                <IcoPlus className="h-[14px] w-[14px]" />
                {t("deliveryNotes.newButton")}
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
                      checked={sortedNotes.length > 0 && selectedIds.size === sortedNotes.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th onClick={() => cycleSort("client")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">{t("deliveryNotes.colClient")} <SortIcon k="client" /></span>
                  </th>
                  <th onClick={() => cycleSort("issueDate")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">{t("deliveryNotes.colDate")} <SortIcon k="issueDate" /></span>
                  </th>
                  <th onClick={() => cycleSort("number")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">{t("deliveryNotes.colNumber")} <SortIcon k="number" /></span>
                  </th>
                  <th>{t("deliveryNotes.colPaid")}</th>
                  <th onClick={() => cycleSort("status")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">{t("deliveryNotes.colStatus")} <SortIcon k="status" /></span>
                  </th>
                  <th
                    onClick={() => cycleSort("total")}
                    style={{ cursor: "pointer", userSelect: "none", textAlign: "right" }}
                  >
                    <span className="inline-flex items-center gap-1 justify-end w-full">
                      <SortIcon k="total" /> {t("deliveryNotes.colTotal")}
                    </span>
                  </th>
                  <th style={{ width: 44 }} />
                </tr>
              </thead>
              <tbody>
                {sortedNotes.map((note) => {
                  const pill = STATUS_PILL[note.status] || { bg: "var(--bg-subtle)", fg: "var(--ink-2)", label: note.status };
                  const clientName = getClientName(note);
                  const isSelected = selectedIds.has(note.id);
                  return (
                    <tr
                      key={note.id}
                      onClick={() => openPreview(note.id)}
                      style={{ cursor: "pointer" }}
                      data-state={isSelected ? "selected" : undefined}
                    >
                      <td onClick={(e) => e.stopPropagation()} style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(note.id)}
                        />
                      </td>
                      {/* Client */}
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
                      {/* Date */}
                      <td>
                        <span className="text-[13px] text-[var(--ink-2)]">
                          {note.issueDate
                            ? format(new Date(note.issueDate), "dd/MM/yyyy")
                            : "—"}
                        </span>
                      </td>
                      {/* Number */}
                      <td>
                        <span className="text-[13px] text-[var(--ink-2)] font-mono">{note.number}</span>
                      </td>
                      {/* Paid */}
                      <td>
                        <span className="text-[13px] text-[var(--ink-3)]">
                          {parseFloat(note.paidAmount || "0") > 0
                            ? formatCurrency(note.paidAmount || "0", note.currency)
                            : "—"}
                        </span>
                      </td>
                      {/* Status */}
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
                          {formatCurrency(note.total, note.currency)}
                        </span>
                      </td>
                      {/* Actions */}
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
                            <DropdownMenuItem onClick={() => openPreview(note.id)}>
                              <IcoEye className="mr-2 h-4 w-4" /> {t("deliveryNotes.actionPreview")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDrawer(note.id)}>
                              <IcoEdit className="mr-2 h-4 w-4" /> {t("deliveryNotes.actionEdit")}
                            </DropdownMenuItem>

                            {/* Status transitions */}
                            <DropdownMenuSeparator />
                            {(note.status === "draft" || note.status === "sent") && (
                              <DropdownMenuItem onClick={() => updateStatus(note.id, "approved")}>
                                <IcoCheck className="mr-2 h-4 w-4" /> {t("deliveryNotes.actionApprove")}
                              </DropdownMenuItem>
                            )}
                            {note.status === "approved" && (
                              <DropdownMenuItem onClick={() => updateStatus(note.id, "delivered")}>
                                <IcoCheckDouble className="mr-2 h-4 w-4" /> {t("deliveryNotes.actionMarkDelivered")}
                              </DropdownMenuItem>
                            )}
                            {note.status === "cancelled" && (
                              <DropdownMenuItem onClick={() => updateStatus(note.id, "sent")}>
                                <IcoSend className="mr-2 h-4 w-4" /> {t("deliveryNotes.actionReactivate")}
                              </DropdownMenuItem>
                            )}
                            {note.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  if (await appConfirm({ title: t("deliveryNotes.cancelTitle"), description: t("deliveryNotes.cancelDescription", { number: note.number }), confirmLabel: t("deliveryNotes.cancelConfirm"), variant: "destructive" })) {
                                    updateStatus(note.id, "cancelled");
                                  }
                                }}
                              >
                                <IcoX className="mr-2 h-4 w-4" /> {t("deliveryNotes.actionCancel")}
                              </DropdownMenuItem>
                            )}

                            {/* Conversion */}
                            {note.status !== "cancelled" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(note.id, "invoice")}>
                                  <IcoExchange className="mr-2 h-4 w-4" /> {t("deliveryNotes.actionConvertInvoice")}
                                </DropdownMenuItem>
                              </>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(note.id, "delivery_note")}>
                              <IcoCopy className="mr-2 h-4 w-4" /> {t("deliveryNotes.actionDuplicate")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadDocumentPDF(note.id, `delivery-${note.number}.pdf`)}>
                              <IcoDownload className="mr-2 h-4 w-4" /> {t("deliveryNotes.actionDownloadPDF")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => deleteNote(note.id)}>
                              <IcoTrash className="mr-2 h-4 w-4" /> {t("deliveryNotes.actionDelete")}
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
          if (!open) { setDrawerInitialData(undefined); setDrawerType("delivery_note"); }
        }}
        type={drawerType}
        documentId={editingId}
        initialData={drawerInitialData}
        onSuccess={fetchNotes}
        onDuplicate={() => { setDrawerOpen(false); if (editingId) fetchDocAndOpenDrawer(editingId, "delivery_note"); }}
        onConvert={(targetType) => {
          setDrawerOpen(false);
          if (editingId) fetchDocAndOpenDrawer(editingId, targetType as "delivery_note" | "invoice");
        }}
      />

      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewNote}
        onEdit={() => { setPreviewOpen(false); if (previewNote) openEditDrawer(previewNote.id); }}
        onRefresh={fetchNotes}
      />
    </div>
  );
}
