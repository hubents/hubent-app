"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  RiAddLine,
  RiSearchLine,
  RiFilterLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiArrowUpDownLine,
  RiCheckLine as RiCheckIcon,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiEyeLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useUserSession } from "@/hooks/use-user-session";
import { useOrgCurrency } from "@/hooks/use-org-currency";
import {
  PaymentDrawer,
  type EditPaymentData,
} from "@/components/finance/payment-drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NumericPagination } from "@/components/ui/numeric-pagination";
import { DocumentPreview } from "@/components/finance/document-preview";
import { ScopeFilter, type ScopeValue } from "@/components/ui/scope-filter";
import { Av } from "@/components/ui/ds";
import { appConfirm } from "@/lib/confirm";

interface Payment {
  id: number;
  documentId: number | null;
  vendorId: number | null;
  contactId: number | null;
  eventId: number | null;
  amount: string;
  currency: string;
  direction: string;
  paymentDate: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  documentNumber?: string | null;
  documentType?: string | null;
  contactName?: string | null;
  vendorName?: string | null;
  eventName?: string | null;
  taskTitle?: string | null;
  status?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

// Status pill colors — vivid palette from prototype's `statusColor()` (finance.jsx:471-490).
const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: "#F6D9BE", fg: "#A35A1F", label: "Pendiente" },
  partial: { bg: "#D4E7F0", fg: "#2F6A85", label: "Parcial" },
  paid: { bg: "#D9ECD1", fg: "#1F6A3A", label: "Pagada" },
  overdue: { bg: "#F8D4D4", fg: "#8B2A2A", label: "Vencida" },
  cancelled: { bg: "#F8D4D4", fg: "#8B2A2A", label: "Cancelado" },
  complete: { bg: "#D9ECD1", fg: "#1F6A3A", label: "Pagada" },
};

// Type pill (Cobro vs Pago) — matches prototype's `typeColor` (finance.jsx:491-494).
// Cobro = red (incoming, money to receive)  · Pago = green (outgoing, money paid out)
const TYPE_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  incoming: { bg: "#F8D4D4", fg: "#8B2A2A", label: "Cobro" },
  outgoing: { bg: "#D9ECD1", fg: "#1F6A3A", label: "Pago" },
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "partial", label: "Parcial" },
  { value: "paid", label: "Pagada" },
  { value: "overdue", label: "Vencida" },
];

const PAYMENT_METHODS: Record<string, string> = {
  bank_transfer: "Transferencia",
  cash: "Efectivo",
  card: "Tarjeta",
  stripe: "Stripe",
  other: "Otro",
};

interface PaymentsPageContentProps {
  /**
   * If set, scopes the page to a single event: only that event's payments are
   * fetched, the standalone/event scope filter is hidden, and the create-payment
   * drawer pre-fills `eventId`. Mirrors the pattern used by `TasksPageContent`.
   */
  eventId?: number;
}

export function PaymentsPageContent({ eventId }: PaymentsPageContentProps = {}) {
  const isEventScoped = typeof eventId === "number";
  const { can } = useUserSession();
  const { formatCurrency } = useOrgCurrency();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<
    "all" | "incoming" | "outgoing"
  >("all");
  const [scope, setScope] = useState<ScopeValue>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPaymentData, setEditPaymentData] = useState<EditPaymentData | null>(
    null,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  // Client-side sort
  type SortKey =
    | "client"
    | "date"
    | "method"
    | "kind"
    | "event"
    | "ref"
    | "status"
    | "total";
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(
    null,
  );
  const cycleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  // Selection (checkbox column) — visual only for now, no bulk actions wired yet.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggleSelected = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directionFilter, page, scope, eventId]);

  // Close status filter on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [filterOpen]);

  async function fetchPayments() {
    try {
      setFetchError(null);
      const params = new URLSearchParams({
        type: "records",
        page: page.toString(),
        limit: "20",
      });
      if (directionFilter !== "all") params.set("direction", directionFilter);
      if (isEventScoped) {
        params.set("eventId", String(eventId));
      } else if (scope !== "all") {
        params.set("scope", scope);
      }

      const res = await fetch(`/api/finance/payments?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPayments(data.data || []);
          setTotalPages(data.meta?.totalPages || 1);
        }
      } else {
        const data = await res.json().catch(() => null);
        const msg = data?.error?.message || `Error del servidor (${res.status})`;
        setFetchError(msg);
        toast.error(msg);
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      setFetchError("No se pudo conectar con el servidor");
      toast.error("Error al cargar pagos");
    } finally {
      setLoading(false);
    }
  }

  async function deletePayment(id: number) {
    if (!await appConfirm({ title: "Eliminar pago", description: "Se recalculará el saldo del documento asociado. Esta acción no se puede deshacer.", confirmLabel: "Eliminar", variant: "destructive" })) return;
    try {
      const res = await fetch(`/api/finance/payments/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Pago eliminado");
        fetchPayments();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al eliminar");
      }
    } catch {
      toast.error("Error al eliminar");
    }
  }

  function openEditPayment(payment: Payment) {
    setEditPaymentData({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency || "EUR",
      direction: payment.direction,
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      notes: payment.notes,
      paymentDate: payment.paymentDate,
      attachmentUrl: payment.attachmentUrl,
      attachmentName: payment.attachmentName,
      contactId: payment.contactId,
      vendorId: payment.vendorId,
      documentId: payment.documentId,
    });
    setDialogOpen(true);
  }

  function openNewPayment() {
    setEditPaymentData(null);
    setDialogOpen(true);
  }

  async function openDocPreview(documentId: number) {
    try {
      const res = await fetch(`/api/finance/documents/${documentId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPreviewDoc(data.data);
          setPreviewOpen(true);
        }
      }
    } catch {
      toast.error("Error al cargar documento");
    }
  }

  const getEntityName = (p: Payment) =>
    p.contactName || p.vendorName || "Sin contacto";

  // Apply search + status filter client-side (API only filters by direction).
  const filteredPayments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return payments.filter((p) => {
      if (statusFilter !== "all" && (p.status || "complete") !== statusFilter)
        return false;
      if (!q) return true;
      const haystack = [
        p.documentNumber,
        p.reference,
        p.contactName,
        p.vendorName,
        p.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [payments, searchTerm, statusFilter]);

  // Sorted view
  const sortedPayments = useMemo(() => {
    if (!sort) return filteredPayments;
    const dir = sort.dir === "asc" ? 1 : -1;
    const valueOf = (p: Payment): string | number => {
      switch (sort.key) {
        case "client":
          return getEntityName(p).toLowerCase();
        case "date":
          return p.paymentDate ? new Date(p.paymentDate).getTime() : 0;
        case "method":
          return p.paymentMethod || "";
        case "kind":
          return p.direction;
        case "event":
          return (p.eventName || "").toLowerCase();
        case "ref":
          return p.documentNumber || p.reference || "";
        case "status":
          return p.status || "complete";
        case "total":
          return parseFloat(p.amount || "0");
      }
    };
    return [...filteredPayments].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [filteredPayments, sort]);

  // KPIs — matches prototype's payment KPIs (finance.jsx:540-545):
  // Total cobrado / Total pagado / Balance / Vencidas
  const kpis = useMemo(() => {
    const incoming = payments
      .filter((p) => p.direction === "incoming")
      .reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
    const outgoing = payments
      .filter((p) => p.direction === "outgoing")
      .reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
    const balance = incoming - outgoing;
    const overdue = payments
      .filter((p) => p.status === "overdue" || p.status === "pending")
      .reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
    return [
      {
        label: "Total cobrado",
        value: formatCurrency(incoming),
        delta: "",
        sub: "del listado",
      },
      {
        label: "Total pagado",
        value: formatCurrency(outgoing),
        delta: "",
        sub: "del listado",
      },
      {
        label: "Balance",
        value: formatCurrency(balance),
        delta: "",
        sub: "neto en el período",
        balance: true,
        positive: balance >= 0,
      },
      {
        label: "Vencidas",
        value: formatCurrency(overdue),
        delta: "",
        sub: "sin cobrar",
        warn: overdue > 0,
      },
    ];
  }, [payments, formatCurrency]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div
          style={{
            height: 80,
            background: "var(--bg-subtle)",
            borderRadius: "var(--r-md)",
            opacity: 0.6,
          }}
        />
        <div
          style={{
            height: 360,
            background: "var(--bg-subtle)",
            borderRadius: "var(--r-md)",
            opacity: 0.4,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── KPI strip ── */}
      <div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--line-1)",
          borderRadius: "var(--r-md)",
          padding: "14px 20px",
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 24,
        }}
      >
        {kpis.map((k, i) => (
          <div key={i} style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>
              {k.label}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: k.warn
                    ? "#B8412D"
                    : k.balance
                      ? k.positive
                        ? "#1F6A3A"
                        : "#B8412D"
                      : "var(--ink-1)",
                }}
              >
                {k.value}
              </span>
              <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Direction tabs (Cobros / Pagos / Todos) ── */}
      <div
        style={{
          display: "inline-flex",
          background: "var(--bg-subtle)",
          borderRadius: "var(--r-sm)",
          padding: 3,
          gap: 2,
        }}
      >
        {[
          { key: "all" as const, label: "Todos" },
          { key: "incoming" as const, label: "Cobros" },
          { key: "outgoing" as const, label: "Pagos" },
        ].map((d) => {
          const active = directionFilter === d.key;
          return (
            <button
              key={d.key}
              onClick={() => {
                setDirectionFilter(d.key);
                setPage(1);
              }}
              style={{
                background: active ? "var(--bg-panel)" : "transparent",
                border: "none",
                padding: "7px 14px",
                fontSize: 12.5,
                fontWeight: 500,
                borderRadius: 6,
                cursor: "pointer",
                color: active ? "var(--ink-1)" : "var(--ink-3)",
                boxShadow: active ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* ── Table card ── */}
      <div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--line-1)",
          borderRadius: "var(--r-md)",
          padding: 18,
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", width: 280 }}>
            <RiSearchLine
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--ink-3)",
                pointerEvents: "none",
              }}
            />
            <input
              placeholder="Buscar por cliente, número, referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px 7px 30px",
                border: "1px solid var(--line-strong)",
                borderRadius: "var(--r-sm)",
                fontSize: 13,
                background: "white",
                fontFamily: "inherit",
                outline: "none",
                color: "var(--ink-1)",
              }}
            />
          </div>

          {!isEventScoped && (
            <ScopeFilter
              value={scope}
              onChange={(v) => {
                setScope(v);
                setPage(1);
              }}
            />
          )}

          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                border: "1px solid var(--line-strong)",
                borderRadius: "var(--r-sm)",
                background: "var(--bg-panel)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--ink-1)",
                cursor: "pointer",
              }}
            >
              <RiFilterLine size={13} />
              {statusFilter === "all"
                ? "Estado"
                : STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
              <RiArrowDownSLine size={12} />
            </button>
            {filterOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  minWidth: 200,
                  background: "white",
                  border: "1px solid var(--line-1)",
                  borderRadius: "var(--r-md)",
                  boxShadow: "0 8px 24px rgba(15,16,18,.08)",
                  padding: 6,
                  zIndex: 30,
                }}
              >
                {STATUS_OPTIONS.map((o) => {
                  const active = statusFilter === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => {
                        setStatusFilter(o.value);
                        setFilterOpen(false);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        border: "none",
                        background: active ? "var(--bg-subtle)" : "transparent",
                        borderRadius: "var(--r-sm)",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "var(--ink-1)",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ flex: 1 }}>{o.label}</span>
                      {active && <RiCheckIcon size={12} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginLeft: "auto" }}>
            {can("finance:create") && (
              <button
                onClick={openNewPayment}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  background: "var(--color-primary)",
                  border: "1px solid var(--color-primary)",
                  borderRadius: "var(--r-sm)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-primary-ink)",
                  cursor: "pointer",
                }}
              >
                <RiAddLine size={14} /> Nuevo Pago
              </button>
            )}
          </div>
        </div>

        {/* Table — 10 cols: checkbox · Cliente · Fecha · Método · Tipo · Evento · Conciliado con · Estado · Total · Actions */}
        <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: 1100,
            borderCollapse: "collapse",
            tableLayout: "auto",
          }}
        >
          <thead>
            <tr>
              {/* Checkbox column header — bulk select (visual only for now) */}
              <th
                style={{
                  width: 30,
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--line-1)",
                  background: "var(--bg-subtle)",
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    sortedPayments.length > 0 &&
                    sortedPayments.every((p) => selected.has(p.id))
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected(new Set(sortedPayments.map((p) => p.id)));
                    } else {
                      setSelected(new Set());
                    }
                  }}
                  style={{ accentColor: "var(--color-primary)", cursor: "pointer" }}
                />
              </th>
              {(
                [
                  { label: "Cliente", key: "client" as SortKey },
                  { label: "Fecha", key: "date" as SortKey },
                  { label: "Método de pago", key: "method" as SortKey },
                  { label: "Tipo", key: "kind" as SortKey },
                  // "Evento" is redundant when the page is already scoped to one
                  // event — drop it so the table fits without horizontal scroll
                  // inside the event-workspace (which has the EventSidebar).
                  ...(isEventScoped
                    ? []
                    : [{ label: "Evento", key: "event" as SortKey }]),
                  { label: "Conciliado con", key: "ref" as SortKey },
                  { label: "Estado", key: "status" as SortKey },
                  { label: "Total", key: "total" as SortKey },
                  { label: "", key: null as SortKey | null },
                ]
              ).map((c, i) => {
                const active = sort && sort.key === c.key;
                const Arrow = active
                  ? sort!.dir === "asc"
                    ? RiArrowUpSLine
                    : RiArrowDownSLine
                  : RiArrowUpDownLine;
                const totalIdx = isEventScoped ? 6 : 7;
                const isLast = i === (isEventScoped ? 7 : 8);
                return (
                  <th
                    key={i}
                    onClick={c.key ? () => cycleSort(c.key as SortKey) : undefined}
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      color: "var(--ink-3)",
                      textAlign: i === totalIdx ? "right" : "left",
                      fontWeight: 600,
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--line-1)",
                      background: "var(--bg-subtle)",
                      width: isLast ? 30 : undefined,
                      cursor: c.key ? "pointer" : "default",
                      userSelect: "none",
                    }}
                  >
                    {c.key ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          flexDirection: i === totalIdx ? "row-reverse" : "row",
                          color: active ? "var(--ink-1)" : "var(--ink-3)",
                        }}
                      >
                        {c.label}
                        <Arrow size={12} style={{ opacity: active ? 1 : 0.4 }} />
                      </span>
                    ) : (
                      ""
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {fetchError ? (
              <tr>
                <td colSpan={isEventScoped ? 9 : 10} style={{ textAlign: "center", padding: 32 }}>
                  <div style={{ color: "#B8412D", fontWeight: 500, marginBottom: 8 }}>
                    {fetchError}
                  </div>
                  <button
                    onClick={() => fetchPayments()}
                    style={{
                      padding: "6px 11px",
                      border: "1px solid var(--line-strong)",
                      borderRadius: "var(--r-sm)",
                      background: "white",
                      fontSize: 12.5,
                      cursor: "pointer",
                    }}
                  >
                    Reintentar
                  </button>
                </td>
              </tr>
            ) : sortedPayments.length === 0 ? (
              <tr>
                <td
                  colSpan={isEventScoped ? 9 : 10}
                  style={{
                    textAlign: "center",
                    padding: "48px 0",
                    color: "var(--ink-3)",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                    No hay pagos
                  </div>
                  <div style={{ fontSize: 12.5 }}>
                    Usa el botón de arriba para registrar el primero
                  </div>
                </td>
              </tr>
            ) : (
              sortedPayments.map((p) => {
                const status = (p.status || "complete") as keyof typeof STATUS_PILL;
                const statusPill = STATUS_PILL[status] || {
                  bg: "var(--bg-subtle)",
                  fg: "var(--ink-2)",
                  label: status,
                };
                const typePill = TYPE_PILL[p.direction] || {
                  bg: "var(--bg-subtle)",
                  fg: "var(--ink-2)",
                  label: p.direction,
                };
                const entityName = getEntityName(p);
                return (
                  <tr
                    key={p.id}
                    onClick={() => p.documentId && openDocPreview(p.documentId)}
                    style={{ cursor: p.documentId ? "pointer" : "default" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-subtle)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Checkbox */}
                    <td
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: 12,
                        borderBottom: "1px solid var(--line-1)",
                        width: 30,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelected(p.id)}
                        style={{
                          accentColor: "var(--color-primary)",
                          cursor: "pointer",
                        }}
                      />
                    </td>
                    {/* Cliente */}
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid var(--line-1)",
                        fontSize: 13,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Av name={entityName} size={30} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>
                          {entityName}
                        </span>
                      </div>
                    </td>
                    {/* Fecha */}
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid var(--line-1)",
                        fontSize: 13,
                        color: "var(--ink-2)",
                      }}
                    >
                      {p.paymentDate
                        ? format(new Date(p.paymentDate), "d 'de' MMMM", {
                            locale: es,
                          })
                        : "—"}
                    </td>
                    {/* Método de pago */}
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid var(--line-1)",
                        fontSize: 13,
                        color: "var(--ink-2)",
                      }}
                    >
                      {p.paymentMethod
                        ? PAYMENT_METHODS[p.paymentMethod] || p.paymentMethod
                        : "—"}
                    </td>
                    {/* Tipo (Cobro/Pago) */}
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid var(--line-1)",
                        fontSize: 13,
                      }}
                    >
                      <span
                        style={{
                          background: typePill.bg,
                          color: typePill.fg,
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11.5,
                          fontWeight: 500,
                        }}
                      >
                        {typePill.label}
                      </span>
                    </td>
                    {/* Evento — hidden inside the event workspace */}
                    {!isEventScoped && (
                      <td
                        style={{
                          padding: 12,
                          borderBottom: "1px solid var(--line-1)",
                          fontSize: 12.5,
                          color: "var(--ink-2)",
                        }}
                      >
                        {p.eventName || "—"}
                      </td>
                    )}
                    {/* Conciliado con — clickable: opens the linked doc preview */}
                    <td
                      onClick={(e) => {
                        if (p.documentId) {
                          e.stopPropagation();
                          openDocPreview(p.documentId);
                        }
                      }}
                      style={{
                        padding: 12,
                        borderBottom: "1px solid var(--line-1)",
                        fontSize: 12.5,
                      }}
                    >
                      {p.documentNumber ? (
                        <span
                          style={{
                            color: "var(--color-primary)",
                            fontWeight: 500,
                            cursor: "pointer",
                            textDecoration: "underline",
                            textUnderlineOffset: 2,
                            textDecorationColor:
                              "color-mix(in srgb, var(--color-primary) 40%, transparent)",
                          }}
                        >
                          {p.documentNumber}
                        </span>
                      ) : (
                        <span style={{ color: "var(--ink-3)" }}>—</span>
                      )}
                    </td>
                    {/* Estado */}
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid var(--line-1)",
                        fontSize: 13,
                      }}
                    >
                      <span
                        style={{
                          background: statusPill.bg,
                          color: statusPill.fg,
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11.5,
                          fontWeight: 500,
                        }}
                      >
                        {statusPill.label}
                      </span>
                    </td>
                    {/* Total */}
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid var(--line-1)",
                        fontSize: 13,
                        fontWeight: 600,
                        textAlign: "right",
                      }}
                    >
                      {formatCurrency(parseFloat(p.amount || "0"), p.currency)}
                    </td>
                    {/* Actions */}
                    <td
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: 12,
                        borderBottom: "1px solid var(--line-1)",
                        textAlign: "center",
                      }}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: "none",
                              background: "transparent",
                              color: "var(--ink-3)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <RiMoreLine className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditPayment(p)}>
                            <RiEditLine className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          {p.documentId && (
                            <DropdownMenuItem
                              onClick={() => openDocPreview(p.documentId!)}
                            >
                              <RiEyeLine className="mr-2 h-4 w-4" /> Ver documento
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deletePayment(p.id)}
                          >
                            <RiDeleteBinLine className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <NumericPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Payment Drawer */}
      <PaymentDrawer
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditPaymentData(null);
        }}
        onSuccess={() => {
          setDialogOpen(false);
          setEditPaymentData(null);
          fetchPayments();
        }}
        editPayment={editPaymentData}
        eventId={isEventScoped ? eventId : undefined}
        showDirectionSelector
      />

      {/* Document Preview */}
      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDoc}
        onRefresh={fetchPayments}
      />
    </div>
  );
}
