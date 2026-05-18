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
import { fmtMoney } from "@/lib/format";
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

interface CreditNote {
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
  parentDocumentId: number | null;
  parentDocumentNumber: string | null;
  items: DocumentItem[];
}

type StatusFilter = "all" | "draft" | "sent" | "approved";

export default function CreditNotesPage() {
  return (
    <Suspense>
      <CreditNotesContent />
    </Suspense>
  );
}

function CreditNotesContent() {
  const t = useTranslations("finance");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { can } = useUserSession();

  const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
    draft:     { bg: "#FCEFC9", fg: "#8A6A1A", label: t("creditNotes.statusPending") },
    sent:      { bg: "#E8D4FF", fg: "#6B4BE0", label: t("creditNotes.statusIssued") },
    approved:  { bg: "#D4E7F0", fg: "#2F6A85", label: t("creditNotes.statusAccounted") },
    accepted:  { bg: "#D4E7F0", fg: "#2F6A85", label: t("creditNotes.statusAccounted") },
    paid:      { bg: "#D4E7F0", fg: "#2F6A85", label: t("creditNotes.statusAccounted") },
    cancelled: { bg: "#F8D4D4", fg: "#8B2A2A", label: t("creditNotes.statusVoided") },
    rejected:  { bg: "#F8D4D4", fg: "#8B2A2A", label: t("creditNotes.statusVoided") },
  };

  const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "all",      label: t("filters.statusAll") },
    { value: "draft",    label: t("creditNotes.statusPending") },
    { value: "sent",     label: t("creditNotes.statusIssued") },
    { value: "approved", label: t("creditNotes.statusAccounted") },
  ];

  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scope, setScope] = useState<ScopeValue>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CreditNote | null>(null);

  type SortKey = "client" | "issueDate" | "number" | "parent" | "status" | "total";
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const cycleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  useEffect(() => { fetchCreditNotes(); }, [page, statusFilter, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      openNewDrawer();
      router.replace("/dashboard/finance/credit-notes");
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchCreditNotes() {
    try {
      setFetchError(null);
      const params = new URLSearchParams({ type: "credit_note", page: page.toString(), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (scope !== "all") params.set("scope", scope);
      if (searchTerm) params.set("search", searchTerm);
      const res = await fetch(`/api/finance/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCreditNotes(data.data || []);
          setTotalPages(data.meta?.totalPages || 1);
        }
      } else {
        const data = await res.json().catch(() => null);
        const msg = data?.error?.message || `Error del servidor (${res.status})`;
        setFetchError(msg);
        toast.error(msg);
      }
    } catch {
      setFetchError(t("creditNotes.connectError"));
      toast.error(t("creditNotes.loadError"));
    } finally {
      setLoading(false);
    }
  }

  async function deleteCreditNote(id: number) {
    if (!await appConfirm({ title: t("creditNotes.deleteTitle"), description: t("creditNotes.deleteDescription"), confirmLabel: t("creditNotes.deleteConfirm"), variant: "destructive" })) return;
    try {
      const res = await fetch(`/api/finance/documents/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success(t("creditNotes.deleted")); fetchCreditNotes(); }
      else { const d = await res.json().catch(() => null); toast.error(d?.error?.message || t("creditNotes.deleteError")); }
    } catch { toast.error(t("creditNotes.deleteError")); }
  }

  async function updateStatus(id: number, status: string) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`${t("creditNotes.statusUpdated")} ${STATUS_PILL[status]?.label || status}`);
        fetchCreditNotes();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.error?.message || t("creditNotes.statusError"));
      }
    } catch { toast.error(t("creditNotes.statusError")); }
  }

  async function duplicate(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}/duplicate`, { method: "POST" });
      if (res.ok) { toast.success(t("creditNotes.duplicated")); fetchCreditNotes(); }
      else { const d = await res.json().catch(() => null); toast.error(d?.error?.message || t("creditNotes.duplicateError")); }
    } catch { toast.error(t("creditNotes.duplicateError")); }
  }

  function openNewDrawer() {
    setEditingId(undefined); setDrawerOpen(true);
  }
  function openEditDrawer(id: number) {
    setEditingId(id); setDrawerOpen(true);
  }
  async function handleBulkDownload() {
    const docs = sortedDocs
      .filter((d) => selectedIds.has(d.id))
      .map((d) => ({ id: d.id, number: d.number || String(d.id) }));
    await downloadBulkDocumentsPDF(docs, `rectificativas-${docs.length}`);
  }

  async function openPreview(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) { setPreviewDoc(data.data); setPreviewOpen(true); }
      }
    } catch { toast.error(t("creditNotes.loadDocError")); }
  }

  const getClientName = (i: CreditNote) =>
    i.contactName ||
    i.companyName ||
    (i.personFirstName ? `${i.personFirstName} ${i.personLastName || ""}`.trim() : "") ||
    i.vendorName ||
    t("table.noClient");

  const sortedDocs = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
    const base = creditNotes.filter((n) => {
      if (!n.issueDate) return true;
      const d = new Date(n.issueDate);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
    if (!sort) return base;
    const list = [...base];
    list.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sort.key) {
        case "client":    av = getClientName(a).toLowerCase(); bv = getClientName(b).toLowerCase(); break;
        case "issueDate": av = new Date(a.issueDate).getTime(); bv = new Date(b.issueDate).getTime(); break;
        case "number":    av = a.number; bv = b.number; break;
        case "parent":    av = a.parentDocumentNumber || ""; bv = b.parentDocumentNumber || ""; break;
        case "status":    av = a.status; bv = b.status; break;
        case "total":     av = parseFloat(a.total); bv = parseFloat(b.total); break;
      }
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [creditNotes, sort, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = useMemo(() => {
    const total          = creditNotes.reduce((s, d) => s + parseFloat(d.total || "0"), 0);
    const emitidas       = creditNotes.filter((d) => d.status !== "cancelled" && d.status !== "rejected" && d.status !== "draft").length;
    const contabilizadas = creditNotes.filter((d) => d.status === "approved" || d.status === "accepted" || d.status === "paid").length;
    const pendientes     = creditNotes.filter((d) => d.status === "draft").length;
    return [
      { label: t("creditNotes.kpiTotal"),     value: fmtMoney(total),           sub: t("creditNotes.kpiThisYear") },
      { label: t("creditNotes.kpiIssued"),    value: String(emitidas),           sub: t("creditNotes.kpiThisMonth") },
      { label: t("creditNotes.kpiAccounted"), value: String(contabilizadas),     sub: t("creditNotes.kpiHistory") },
      { label: t("creditNotes.kpiPending"),   value: String(pendientes),         sub: t("creditNotes.kpiNow") },
    ];
  }, [creditNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedDocs.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedDocs.map((d) => d.id)));
  };

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
              placeholder={t("creditNotes.search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchCreditNotes(); } }}
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
                  : t("creditNotes.statusFilter")}
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
                  {t("creditNotes.dateFrom")}
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: "6px 10px", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--ink-1)", fontFamily: "inherit", outline: "none" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 500, color: "var(--ink-3)" }}>
                  {t("creditNotes.dateTo")}
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: "6px 10px", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--ink-1)", fontFamily: "inherit", outline: "none" }} />
                </label>
              </div>
            )}
          </div>

          {/* Bulk download */}
          <button
            onClick={handleBulkDownload}
            disabled={selectedIds.size === 0}
            title={selectedIds.size > 0 ? t("creditNotes.downloadTitle", { count: selectedIds.size }) : t("creditNotes.downloadHint")}
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
                {t("creditNotes.newButton")}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {fetchError ? (
          <div className="text-center py-10">
            <div className="text-[13px] font-medium mb-3" style={{ color: "#B8412D" }}>{fetchError}</div>
            <button
              onClick={fetchCreditNotes}
              className="px-3 py-1.5 rounded-[7px] text-[12.5px] cursor-pointer"
              style={{ border: "1px solid var(--line-strong)", background: "#FFFFFF" }}
            >
              {t("creditNotes.retry")}
            </button>
          </div>
        ) : creditNotes.length === 0 ? (
          <div className="text-center py-14">
            <div className="text-[14px] font-semibold text-[var(--ink-1)] mb-1">{t("creditNotes.empty")}</div>
            <div className="text-[12.5px] text-[var(--ink-3)] mb-4">
              {searchTerm ? t("creditNotes.emptySearch") : t("creditNotes.emptyCreate")}
            </div>
            {!searchTerm && can("finance:create") && (
              <button
                onClick={openNewDrawer}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer mx-auto"
                style={{ background: "var(--color-primary)", color: "#FFFFFF", border: "1px solid var(--color-primary)" }}
              >
                <IcoPlus className="h-[14px] w-[14px]" />
                {t("creditNotes.newButton")}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>
                    <input
                      type="checkbox"
                      checked={sortedDocs.length > 0 && selectedIds.size === sortedDocs.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th onClick={() => cycleSort("client")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">{t("creditNotes.colClient")} <SortIcon k="client" /></span>
                  </th>
                  <th onClick={() => cycleSort("issueDate")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">{t("creditNotes.colDate")} <SortIcon k="issueDate" /></span>
                  </th>
                  <th onClick={() => cycleSort("number")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">{t("creditNotes.colNumber")} <SortIcon k="number" /></span>
                  </th>
                  <th onClick={() => cycleSort("parent")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">{t("creditNotes.colOriginalInvoice")} <SortIcon k="parent" /></span>
                  </th>
                  <th onClick={() => cycleSort("status")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">{t("creditNotes.colStatus")} <SortIcon k="status" /></span>
                  </th>
                  <th
                    onClick={() => cycleSort("total")}
                    style={{ cursor: "pointer", userSelect: "none", textAlign: "right" }}
                  >
                    <span className="inline-flex items-center gap-1 justify-end w-full">
                      <SortIcon k="total" /> {t("creditNotes.colTotal")}
                    </span>
                  </th>
                  <th style={{ width: 44 }} />
                </tr>
              </thead>
              <tbody>
                {sortedDocs.map((doc) => {
                  const pill = STATUS_PILL[doc.status] || { bg: "var(--bg-subtle)", fg: "var(--ink-2)", label: doc.status };
                  const clientName = getClientName(doc);
                  const isSelected = selectedIds.has(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => openPreview(doc.id)}
                      style={{ cursor: "pointer" }}
                      data-state={isSelected ? "selected" : undefined}
                    >
                      {/* Checkbox */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(doc.id)}
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
                          {format(new Date(doc.issueDate), "dd/MM/yyyy")}
                        </span>
                      </td>
                      {/* Number */}
                      <td>
                        <span className="text-[13px] text-[var(--ink-2)] font-mono">{doc.number}</span>
                      </td>
                      {/* Original invoice */}
                      <td>
                        <span className="text-[12px] text-[var(--ink-3)]">
                          {doc.parentDocumentNumber || "—"}
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
                        <span className="text-[13px] font-semibold" style={{ color: "#E14F4F" }}>
                          {fmtMoney(parseFloat(doc.total || "0"))}
                        </span>
                      </td>
                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="inline-flex items-center justify-center rounded-[6px] transition-colors hover:bg-[var(--bg-subtle)] cursor-pointer border-none bg-transparent"
                              style={{ width: 28, height: 28, color: "var(--ink-3)" }}
                              aria-label={t("creditNotes.actionsLabel")}
                            >
                              <IcoMore className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openPreview(doc.id)}>
                              <IcoEye className="mr-2 h-4 w-4" /> {t("creditNotes.actionPreview")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDrawer(doc.id)}>
                              <IcoEdit className="mr-2 h-4 w-4" /> {t("creditNotes.actionEdit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicate(doc.id)}>
                              <IcoCopy className="mr-2 h-4 w-4" /> {t("creditNotes.actionDuplicate")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadDocumentPDF(doc.id, doc.number)}>
                              <IcoDownload className="mr-2 h-4 w-4" /> {t("creditNotes.actionDownloadPDF")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {doc.status === "draft" && (
                              <DropdownMenuItem onClick={() => updateStatus(doc.id, "sent")}>
                                <IcoSend className="mr-2 h-4 w-4" /> {t("creditNotes.actionMarkIssued")}
                              </DropdownMenuItem>
                            )}
                            {doc.status === "sent" && (
                              <DropdownMenuItem onClick={() => updateStatus(doc.id, "approved")}>
                                <IcoCheckDouble className="mr-2 h-4 w-4" /> {t("creditNotes.actionMarkAccounted")}
                              </DropdownMenuItem>
                            )}
                            {doc.status !== "cancelled" && (
                              <DropdownMenuItem onClick={() => updateStatus(doc.id, "cancelled")}>
                                <IcoX className="mr-2 h-4 w-4" /> {t("creditNotes.actionVoid")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {can("finance:delete") && (
                              <DropdownMenuItem className="text-red-600" onClick={() => deleteCreditNote(doc.id)}>
                                <IcoTrash className="mr-2 h-4 w-4" /> {t("creditNotes.actionDelete")}
                              </DropdownMenuItem>
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

      {/* Drawer */}
      <DocumentDrawer
        type="credit_note"
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) setEditingId(undefined);
        }}
        documentId={editingId}
        onSuccess={() => { setDrawerOpen(false); fetchCreditNotes(); }}
      />

      {/* Preview */}
      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDoc}
        onEdit={() => {
          if (previewDoc) { setPreviewOpen(false); openEditDrawer(previewDoc.id); }
        }}
      />
    </div>
  );
}
