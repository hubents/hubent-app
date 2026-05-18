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
  TruckIcon,
  Download01Icon,
  Calendar01Icon,
  HandCoinsIcon,
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

const IcoSearch    = hgIcon(Search01Icon);
const IcoPlus      = hgIcon(PlusSignIcon);
const IcoFilter    = hgIcon(FilterHorizontalIcon);
const IcoChevDown  = hgIcon(ArrowDown01Icon);
const IcoChevUp    = hgIcon(ArrowUp01Icon);
const IcoSort      = hgIcon(ArrowUpDownIcon);
const IcoCheck     = hgIcon(Tick01Icon);
const IcoMore      = hgIcon(MoreVerticalIcon);
const IcoEdit      = hgIcon(PencilEdit02Icon);
const IcoCopy      = hgIcon(Copy01Icon);
const IcoTrash     = hgIcon(Delete01Icon);
const IcoExchange  = hgIcon(Exchange01Icon);
const IcoSend      = hgIcon(MailSend01Icon);
const IcoX         = hgIcon(Cancel01Icon);
const IcoEye       = hgIcon(EyeIcon);
const IcoTruck     = hgIcon(TruckIcon);
const IcoDownload  = hgIcon(Download01Icon);
const IcoCalendar  = hgIcon(Calendar01Icon);
const IcoHandCoins = hgIcon(HandCoinsIcon);

interface DocumentItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  total: string;
}

interface Quote {
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

const STATUS_PILL_COLORS: Record<string, { bg: string; fg: string }> = {
  draft:           { bg: "#EDEAE3", fg: "#5B5649" },
  sent:            { bg: "#E8D4FF", fg: "#6B4BE0" },
  accepted:        { bg: "#D9ECD1", fg: "#1F6A3A" },
  payment_promise: { bg: "#FCEFC9", fg: "#8A6A1A" },
  rejected:        { bg: "#F8D4D4", fg: "#8B2A2A" },
  cancelled:       { bg: "#F8D4D4", fg: "#8B2A2A" },
  approved:        { bg: "#D9ECD1", fg: "#1F6A3A" },
  paid:            { bg: "#D9ECD1", fg: "#1F6A3A" },
  delivered:       { bg: "#D9ECD1", fg: "#1F6A3A" },
  partial:         { bg: "#FCEFC9", fg: "#8A6A1A" },
};

type StatusFilter = "all" | "draft" | "sent" | "accepted" | "payment_promise" | "rejected";

export default function QuotesPage() {
  return (
    <Suspense>
      <QuotesContent />
    </Suspense>
  );
}

function QuotesContent() {
  const t = useTranslations("finance");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { can } = useUserSession();

  const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "all",             label: t("filters.statusAll") },
    { value: "draft",           label: t("quotes.statusDraft") },
    { value: "sent",            label: t("quotes.statusSent") },
    { value: "accepted",        label: t("quotes.statusAccepted") },
    { value: "payment_promise", label: t("quotes.statusPaymentPromise") },
    { value: "rejected",        label: t("quotes.statusCancelled") },
  ];

  const [quotes, setQuotes] = useState<Quote[]>([]);
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
  const [drawerType, setDrawerType] = useState<"quote" | "invoice" | "delivery_note">("quote");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);

  useEffect(() => { fetchQuotes(); }, [page, statusFilter, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      openNewDrawer();
      router.replace("/dashboard/finance/quotes");
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchQuotes() {
    try {
      setFetchError(null);
      const params = new URLSearchParams({ type: "quote", page: page.toString(), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (scope !== "all") params.set("scope", scope);
      if (searchTerm) params.set("search", searchTerm);
      const res = await fetch(`/api/finance/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setQuotes(data.data || []);
          setTotalPages(data.meta?.totalPages || 1);
        }
      } else {
        const data = await res.json().catch(() => null);
        const msg = data?.error?.message || `Error del servidor (${res.status})`;
        setFetchError(msg);
        toast.error(msg);
      }
    } catch {
      setFetchError(t("toast.connectError"));
      toast.error(t("toast.loadQuotesError"));
    } finally {
      setLoading(false);
    }
  }

  async function deleteQuote(id: number) {
    if (!await appConfirm({ title: t("confirm.deleteQuoteTitle"), description: t("confirm.deleteDescription"), confirmLabel: t("confirm.confirmLabel"), variant: "destructive" })) return;
    try {
      const res = await fetch(`/api/finance/documents/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success(t("toast.quoteDeleted")); fetchQuotes(); }
      else { const d = await res.json().catch(() => null); toast.error(d?.error?.message || t("toast.deleteError")); }
    } catch { toast.error(t("toast.deleteError")); }
  }

  async function fetchDocAndOpenDrawer(id: number, targetType: "quote" | "invoice" | "delivery_note") {
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
    } catch { toast.error(t("toast.loadError")); }
  }

  async function updateStatus(id: number, status: string) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const knownStatuses = ["paid","pending","draft","overdue","sent","accepted","cancelled","rejected","partial","delivered","payment_promise","approved","complete"];
        const statusLabel = knownStatuses.includes(status)
          ? t(`status.${status as "paid" | "pending" | "draft" | "overdue" | "sent" | "accepted" | "cancelled" | "rejected" | "partial" | "delivered" | "payment_promise" | "approved" | "complete"}`)
          : status;
        toast.success(`${t("toast.statusUpdated")} ${statusLabel}`);
        fetchQuotes();
        if (status === "accepted") {
          const generate = await appConfirm({ title: t("confirm.generateInvoiceTitle"), description: t("confirm.generateInvoiceDescription"), confirmLabel: t("confirm.generateInvoiceConfirm") });
          if (generate) await fetchDocAndOpenDrawer(id, "invoice");
        }
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.error?.message || t("toast.statusError"));
      }
    } catch { toast.error(t("toast.statusError")); }
  }

  function openNewDrawer() {
    setEditingId(undefined); setDrawerInitialData(undefined); setDrawerType("quote"); setDrawerOpen(true);
  }
  function openEditDrawer(id: number) {
    setEditingId(id); setDrawerInitialData(undefined); setDrawerType("quote"); setDrawerOpen(true);
  }
  async function handleBulkDownload() {
    const docs = sortedQuotes
      .filter((q) => selectedIds.has(q.id))
      .map((q) => ({ id: q.id, number: q.number || String(q.id) }));
    await downloadBulkDocumentsPDF(docs, `presupuestos-${docs.length}`);
  }

  async function openPreview(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) { setPreviewQuote(data.data); setPreviewOpen(true); }
      }
    } catch { toast.error(t("toast.loadError")); }
  }

  const formatCurrency = (amount: string, currency = "EUR") =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(parseFloat(amount || "0"));

  const getClientName = (q: Quote) =>
    q.contactName ||
    q.companyName ||
    (q.personFirstName ? `${q.personFirstName} ${q.personLastName || ""}`.trim() : "") ||
    q.vendorName ||
    t("table.noClient");

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedQuotes.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedQuotes.map((q) => q.id)));
  };

  const sortedQuotes = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
    const base = quotes.filter((q) => {
      if (!q.issueDate) return true;
      const d = new Date(q.issueDate);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
    if (!sort) return base;
    const dir = sort.dir === "asc" ? 1 : -1;
    const valueOf = (q: Quote): string | number => {
      switch (sort.key) {
        case "client":    return getClientName(q).toLowerCase();
        case "issueDate": return q.issueDate ? new Date(q.issueDate).getTime() : 0;
        case "number":    return q.number || "";
        case "status":    return q.status;
        case "total":     return parseFloat(q.total || "0");
      }
    };
    return [...base].sort((a, b) => {
      const va = valueOf(a), vb = valueOf(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [quotes, sort, dateFrom, dateTo]);

  const kpis = useMemo(() => {
    const sum = (arr: Quote[]) => arr.reduce((acc, q) => acc + parseFloat(q.total || "0"), 0);
    const accepted  = quotes.filter(q => q.status === "accepted" || q.status === "payment_promise");
    const pending   = quotes.filter(q => q.status === "sent");
    const cancelled = quotes.filter(q => q.status === "rejected" || q.status === "cancelled");
    const total     = sum(quotes);
    const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : "0%";
    return [
      { label: t("quotes.kpiIssued"),    value: formatCurrency(String(total)), delta: "",                  sub: t("quotes.kpiOfList") },
      { label: t("quotes.kpiAccepted"),  value: formatCurrency(String(sum(accepted))),  delta: pct(sum(accepted)),  sub: t("quotes.kpiOfTotal") },
      { label: t("quotes.kpiPending"),   value: formatCurrency(String(sum(pending))),   delta: pct(sum(pending)),   sub: t("quotes.kpiOfTotal") },
      { label: t("quotes.kpiCancelled"), value: formatCurrency(String(sum(cancelled))), delta: pct(sum(cancelled)), sub: t("quotes.kpiOfTotal") },
    ];
  }, [quotes]);

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
              placeholder={t("filters.searchQuotes")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchQuotes(); } }}
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
                  : t("filters.status")}
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
                  {t("filters.dateFrom")}
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: "6px 10px", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--ink-1)", fontFamily: "inherit", outline: "none" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 500, color: "var(--ink-3)" }}>
                  {t("filters.dateTo")}
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: "6px 10px", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--ink-1)", fontFamily: "inherit", outline: "none" }} />
                </label>
              </div>
            )}
          </div>

          {/* Bulk download */}
          <button
            onClick={handleBulkDownload}
            disabled={selectedIds.size === 0}
            title={selectedIds.size > 0 ? t("quotes.downloadTitle").replace("{count}", String(selectedIds.size)) : t("quotes.downloadHint")}
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
                {t("buttons.newQuote")}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {fetchError ? (
          <div className="text-center py-10">
            <div className="text-[13px] font-medium mb-3" style={{ color: "#B8412D" }}>{fetchError}</div>
            <button
              onClick={fetchQuotes}
              className="px-3 py-1.5 rounded-[7px] text-[12.5px] cursor-pointer"
              style={{ border: "1px solid var(--line-strong)", background: "#FFFFFF" }}
            >
              {t("buttons.retry")}
            </button>
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-14">
            <div className="text-[14px] font-semibold text-[var(--ink-1)] mb-1">{t("quotes.empty")}</div>
            <div className="text-[12.5px] text-[var(--ink-3)] mb-4">
              {searchTerm ? t("quotes.emptySearch") : t("quotes.emptyCreate")}
            </div>
            {!searchTerm && can("finance:create") && (
              <button
                onClick={openNewDrawer}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer mx-auto"
                style={{ background: "var(--color-primary)", color: "#FFFFFF", border: "1px solid var(--color-primary)" }}
              >
                <IcoPlus className="h-[14px] w-[14px]" />
                {t("buttons.newQuote")}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={sortedQuotes.length > 0 && selectedIds.size === sortedQuotes.length} onChange={toggleSelectAll} />
                  </th>
                  <th onClick={() => cycleSort("client")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">{t("table.client")} <SortIcon k="client" /></span>
                  </th>
                  <th onClick={() => cycleSort("issueDate")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">{t("table.date")} <SortIcon k="issueDate" /></span>
                  </th>
                  <th onClick={() => cycleSort("number")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">{t("table.number")} <SortIcon k="number" /></span>
                  </th>
                  <th>{t("table.paid")}</th>
                  <th onClick={() => cycleSort("status")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">{t("table.status")} <SortIcon k="status" /></span>
                  </th>
                  <th
                    onClick={() => cycleSort("total")}
                    style={{ cursor: "pointer", userSelect: "none", textAlign: "right" }}
                  >
                    <span className="inline-flex items-center gap-1 justify-end w-full">
                      <SortIcon k="total" /> {t("table.total")}
                    </span>
                  </th>
                  <th style={{ width: 44 }} />
                </tr>
              </thead>
              <tbody>
                {sortedQuotes.map((quote) => {
                  const pillColors = STATUS_PILL_COLORS[quote.status] || { bg: "var(--bg-subtle)", fg: "var(--ink-2)" };
                  const knownStatuses = ["paid","pending","draft","overdue","sent","accepted","cancelled","rejected","partial","delivered","payment_promise","approved","complete"];
                  const pillLabel = knownStatuses.includes(quote.status)
                    ? t(`status.${quote.status as "paid" | "pending" | "draft" | "overdue" | "sent" | "accepted" | "cancelled" | "rejected" | "partial" | "delivered" | "payment_promise" | "approved" | "complete"}`)
                    : quote.status;
                  const clientName = getClientName(quote);
                  const isSelected = selectedIds.has(quote.id);
                  return (
                    <tr
                      key={quote.id}
                      onClick={() => openPreview(quote.id)}
                      style={{ cursor: "pointer" }}
                      data-state={isSelected ? "selected" : undefined}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(quote.id)} />
                      </td>
                      {/* Cliente */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex-shrink-0 flex items-center justify-center rounded-full text-[11.5px] font-semibold text-white"
                            style={{ width: 30, height: 30, background: avColor(clientName), fontSize: 11 }}
                          >
                            {initials(clientName)}
                          </div>
                          <span className="text-[13px] font-medium text-[var(--ink-1)]">{clientName}</span>
                        </div>
                      </td>
                      {/* Fecha */}
                      <td>
                        <span className="text-[13px] text-[var(--ink-2)]">
                          {quote.issueDate
                            ? format(new Date(quote.issueDate), "dd/MM/yyyy")
                            : "—"}
                        </span>
                      </td>
                      {/* Número */}
                      <td>
                        <span className="text-[13px] text-[var(--ink-2)] font-mono">{quote.number}</span>
                      </td>
                      {/* Pagado */}
                      <td>
                        <span className="text-[13px] text-[var(--ink-3)]">
                          {parseFloat(quote.paidAmount || "0") > 0
                            ? formatCurrency(quote.paidAmount || "0", quote.currency)
                            : "—"}
                        </span>
                      </td>
                      {/* Estado */}
                      <td>
                        <span
                          className="inline-flex items-center rounded-[999px] text-[11.5px] font-medium"
                          style={{ background: pillColors.bg, color: pillColors.fg, padding: "3px 10px" }}
                        >
                          {pillLabel}
                        </span>
                      </td>
                      {/* Total */}
                      <td style={{ textAlign: "right" }}>
                        <span className="text-[13px] font-semibold text-[var(--ink-1)]">
                          {formatCurrency(quote.total, quote.currency)}
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
                            <DropdownMenuItem onClick={() => openPreview(quote.id)}>
                              <IcoEye className="mr-2 h-4 w-4" /> {t("actions.preview")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDrawer(quote.id)}>
                              <IcoEdit className="mr-2 h-4 w-4" /> {t("actions.edit")}
                            </DropdownMenuItem>

                            {/* Status transitions */}
                            {(quote.status === "draft" || quote.status === "sent") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => updateStatus(quote.id, "accepted")}>
                                  <IcoCheck className="mr-2 h-4 w-4" />
                                  {quote.status === "sent" ? t("actions.markAccepted") : t("actions.accept")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(quote.id, "rejected")}>
                                  <IcoX className="mr-2 h-4 w-4" /> {t("actions.reject")}
                                </DropdownMenuItem>
                              </>
                            )}
                            {quote.status !== "sent" && (
                              <DropdownMenuItem onClick={() => updateStatus(quote.id, "sent")}>
                                <IcoSend className="mr-2 h-4 w-4" />
                                {quote.status === "rejected" || quote.status === "cancelled" ? t("actions.reactivate") : t("actions.markSent")}
                              </DropdownMenuItem>
                            )}
                            {quote.status === "accepted" && (
                              <DropdownMenuItem onClick={() => updateStatus(quote.id, "payment_promise")}>
                                <IcoHandCoins className="mr-2 h-4 w-4" /> {t("actions.paymentPromise")}
                              </DropdownMenuItem>
                            )}
                            {quote.status === "payment_promise" && (
                              <DropdownMenuItem onClick={() => updateStatus(quote.id, "accepted")}>
                                <IcoCheck className="mr-2 h-4 w-4" /> {t("actions.markAccepted")}
                              </DropdownMenuItem>
                            )}

                            {/* Conversions */}
                            {(quote.status === "accepted" || quote.status === "payment_promise") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(quote.id, "invoice")}>
                                  <IcoExchange className="mr-2 h-4 w-4" /> {t("actions.convertInvoice")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(quote.id, "delivery_note")}>
                                  <IcoTruck className="mr-2 h-4 w-4" /> {t("actions.convertDelivery")}
                                </DropdownMenuItem>
                              </>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(quote.id, "quote")}>
                              <IcoCopy className="mr-2 h-4 w-4" /> {t("actions.duplicate")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadDocumentPDF(quote.id, `presupuesto-${quote.number}.pdf`)}>
                              <IcoDownload className="mr-2 h-4 w-4" /> {t("actions.downloadPDF")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => deleteQuote(quote.id)}>
                              <IcoTrash className="mr-2 h-4 w-4" /> {t("actions.delete")}
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
          if (!open) { setDrawerInitialData(undefined); setDrawerType("quote"); }
        }}
        type={drawerType}
        documentId={editingId}
        initialData={drawerInitialData}
        onSuccess={fetchQuotes}
        onDuplicate={() => { setDrawerOpen(false); if (editingId) fetchDocAndOpenDrawer(editingId, "quote"); }}
        onConvert={(targetType) => {
          setDrawerOpen(false);
          if (editingId) fetchDocAndOpenDrawer(editingId, targetType as "quote" | "invoice" | "delivery_note");
        }}
      />

      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewQuote}
        onEdit={() => { setPreviewOpen(false); if (previewQuote) openEditDrawer(previewQuote.id); }}
        onRefresh={fetchQuotes}
      />
    </div>
  );
}
