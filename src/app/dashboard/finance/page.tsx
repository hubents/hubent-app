"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RiLineChartLine,
  RiPieChartLine,
  RiFileTextLine,
  RiFileList2Line,
  RiMoneyDollarCircleLine,
  RiDownloadLine,
  RiArrowRightSLine,
  RiCalendarLine,
  RiAlertLine,
  RiUser3Line,
  RiFileLine,
} from "@remixicon/react";
import { useUserSession } from "@/hooks/use-user-session";
import { useOrgCurrency } from "@/hooks/use-org-currency";
import { getInitials as initials, AV_COLORS } from "@/lib/ui-utils";

// ─── Types from /api/finance/dashboard ──
interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingInvoices: number;
  pendingInvoicesCount: number;
  pendingPayments: number;
  overdueInvoices: number;
  overdueInvoicesCount: number;
  currency: string;
  incomeChange: number;
  expensesChange: number;
  aging: {
    current: number;
    days0to30: number;
    days31to60: number;
    days61to90: number;
    over90: number;
  };
  cashFlow: {
    next30Days: number;
    next60Days: number;
    next90Days: number;
  };
  topClients: Array<{
    id: number;
    name: string;
    email?: string;
    total: number;
    invoiceCount: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
}

interface RecentDocument {
  id: number;
  type: string;
  number: string;
  clientName: string | null;
  total: string;
  status: string;
  currency?: string | null;
  dueDate: string | null;
}

// ─── Period selector pill (visual only, mirrors prototype's SegPeriod) ──
function SegPeriod({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--bg-subtle)",
        borderRadius: "var(--r-sm)",
        padding: 2,
        gap: 2,
      }}
    >
      {options.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            background: value === p ? "white" : "transparent",
            border: "none",
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 500,
            borderRadius: 4,
            cursor: "pointer",
            color: value === p ? "var(--ink-1)" : "var(--ink-3)",
            boxShadow:
              value === p ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
          }}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ─── Card primitive (inline-styled to match prototype's `.card` class) ──
function FinCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--line-1)",
        borderRadius: "var(--r-md)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  paid: { bg: "#DCEFE1", fg: "#1F6B3A", label: "PAGADA" },
  accepted: { bg: "#DCEFE1", fg: "#1F6B3A", label: "ACEPTADA" },
  sent: { bg: "#E0E7F8", fg: "#2A4A8B", label: "ENVIADA" },
  pending: { bg: "#FBEBC9", fg: "#8B5E1A", label: "PENDIENTE" },
  partial: { bg: "#FBEBC9", fg: "#8B5E1A", label: "PARCIAL" },
  overdue: { bg: "#F8D4D4", fg: "#8B2A2A", label: "VENCIDA" },
  rejected: { bg: "#F8D4D4", fg: "#8B2A2A", label: "RECHAZADA" },
  cancelled: { bg: "#EEEAE0", fg: "#6B6660", label: "CANCELADA" },
  draft: { bg: "#EEEAE0", fg: "#6B6660", label: "BORRADOR" },
};

const TYPE_LABEL: Record<string, string> = {
  quote: "Presupuesto",
  proforma: "Proforma",
  invoice: "Factura",
  delivery_note: "Albarán",
  credit_note: "Nota de crédito",
};

export default function FinanceDashboardPage() {
  const { can } = useUserSession();
  const { formatCurrency: orgFmt } = useOrgCurrency();
  const canCreate = can("finance:create");

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [barPeriod, setBarPeriod] = useState("1M");
  const [cashPeriod, setCashPeriod] = useState("1Y");

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, docsRes] = await Promise.all([
          fetch("/api/finance/dashboard"),
          fetch("/api/finance/documents?limit=5"),
        ]);
        if (statsRes.ok) {
          const j = await statsRes.json();
          if (j.success) setStats(j.data);
        }
        if (docsRes.ok) {
          const j = await docsRes.json();
          if (j.success) setRecent(j.data || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmt = (amount: number, currency?: string) => orgFmt(amount, currency);
  const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`;

  // ── Bar chart data: stacked income/expense per month ──
  const bars = useMemo(() => {
    const list = stats?.monthlyRevenue || [];
    if (list.length === 0) {
      return Array.from({ length: 6 }, (_, i) => ({
        d: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"][i],
        inc: 0,
        exp: 0,
      }));
    }
    return list.slice(-7).map((m) => ({
      d: m.month.slice(0, 3),
      inc: m.income,
      exp: m.expenses,
    }));
  }, [stats]);
  const maxBar = Math.max(1, ...bars.map((b) => b.inc + b.exp));
  const peakBarIdx = bars.reduce(
    (best, b, i) => (b.inc + b.exp > bars[best].inc + bars[best].exp ? i : best),
    0,
  );

  // ── Aging totals for the gauge ──
  const agingTotal = stats
    ? stats.aging.current +
      stats.aging.days0to30 +
      stats.aging.days31to60 +
      stats.aging.days61to90 +
      stats.aging.over90
    : 0;

  // ── Cash flow line: interpolate 3 buckets into 31 daily points ──
  const cashPoints = useMemo(() => {
    if (!stats?.cashFlow) return Array(31).fill(0);
    const { next30Days, next60Days, next90Days } = stats.cashFlow;
    // Linear interpolation across 31 points; clamp to non-negative.
    const a = Math.max(0, next30Days);
    const b = Math.max(0, next60Days);
    const c = Math.max(0, next90Days);
    return Array.from({ length: 31 }, (_, i) => {
      if (i <= 10) return a + ((b - a) * i) / 10;
      if (i <= 20) return b + ((c - b) * (i - 10)) / 10;
      return c;
    });
  }, [stats]);
  const maxCash = Math.max(1, ...cashPoints);
  const minCash = Math.min(...cashPoints);
  const W = 440;
  const H = 120;
  const linePath = useMemo(() => {
    if (cashPoints.every((v) => v === 0)) return "";
    return cashPoints
      .map((v, i) => {
        const x = (i / (cashPoints.length - 1)) * W;
        const span = maxCash - minCash || 1;
        const y = H - ((v - minCash) / span) * H * 0.8 - 10;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [cashPoints, maxCash, minCash]);
  const peakIdx = cashPoints.indexOf(Math.max(...cashPoints));
  const peakX = (peakIdx / (cashPoints.length - 1)) * W;
  const peakY =
    H - ((cashPoints[peakIdx] - minCash) / (maxCash - minCash || 1)) * H * 0.8 - 10;

  const cashTotal =
    (stats?.cashFlow?.next30Days || 0) +
    (stats?.cashFlow?.next60Days || 0) +
    (stats?.cashFlow?.next90Days || 0);

  const shortcuts: Array<{
    Icon: typeof RiFileTextLine;
    title: string;
    subtitle: string;
    href: string;
    show: boolean;
  }> = [
    {
      Icon: RiFileTextLine,
      title: "Nuevo presupuesto",
      subtitle: "Crear presupuesto rápido",
      href: "/dashboard/finance/quotes/new",
      show: canCreate,
    },
    {
      Icon: RiFileList2Line,
      title: "Crear factura",
      subtitle: "Factura rápida",
      href: "/dashboard/finance/invoices/new",
      show: canCreate,
    },
    {
      Icon: RiMoneyDollarCircleLine,
      title: "Registrar pago",
      subtitle: "Agregar pago",
      href: "/dashboard/finance/payments",
      show: canCreate,
    },
    {
      Icon: RiDownloadLine,
      title: "Exportar reportes",
      subtitle: "Exportar reportes",
      href: "/dashboard/finance/reports",
      show: true,
    },
  ];

  // KPIs derived from stats with safe fallbacks
  const kpis = [
    {
      label: "Ingresos del Mes",
      value: fmt(stats?.totalIncome || 0, stats?.currency),
      delta: stats?.incomeChange ?? 0,
      sub: "vs mes anterior",
      pos: (stats?.incomeChange ?? 0) >= 0,
    },
    {
      label: "Gastos del Mes",
      value: fmt(stats?.totalExpenses || 0, stats?.currency),
      delta: stats?.expensesChange ?? 0,
      sub: "vs mes anterior",
      pos: (stats?.expensesChange ?? 0) <= 0,
    },
    {
      label: "Por Cobrar",
      value: fmt(stats?.pendingInvoices || 0, stats?.currency),
      delta: stats?.pendingInvoicesCount || 0,
      sub: "facturas pendientes",
      pos: true,
      isCount: true,
    },
    {
      label: "Vencidas",
      value: fmt(stats?.overdueInvoices || 0, stats?.currency),
      delta: stats?.overdueInvoicesCount || 0,
      sub: "facturas vencidas",
      pos: false,
      isCount: true,
    },
  ];

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
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 290,
                background: "var(--bg-subtle)",
                borderRadius: "var(--r-md)",
                opacity: 0.4,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── KPI strip — 4 columns inside a single card ── */}
      <FinCard
        style={{
          padding: "14px 20px",
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 24,
        }}
      >
        {kpis.map((k, i) => (
          <div key={i} style={{ minWidth: 0 }}>
            <div
              style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}
            >
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
              <span style={{ fontSize: 18, fontWeight: 600 }}>{k.value}</span>
              {!k.isCount && k.delta !== 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: k.pos ? "var(--success)" : "#B8412D",
                  }}
                >
                  {fmtPct(k.delta as number)}
                </span>
              )}
              <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
                {k.isCount && k.delta ? `${k.delta} ` : ""}
                {k.sub}
              </span>
            </div>
          </div>
        ))}
      </FinCard>

      {/* ── Row 1: 3 charts ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
        }}
      >
        {/* Income vs Expenses (stacked bars) */}
        <FinCard style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <RiLineChartLine size={15} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              Ingresos vs gastos
            </span>
          </div>
          <SegPeriod
            value={barPeriod}
            onChange={setBarPeriod}
            options={["1D", "1W", "1M", "3M", "1Y"]}
          />
          <div
            style={{
              position: "relative",
              height: 190,
              marginTop: 14,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              padding: "0 4px",
            }}
          >
            {bars.map((b, i) => {
              const total = b.inc + b.exp;
              const totalH = (total / maxBar) * 160;
              const incH = total > 0 ? (b.inc / total) * totalH : 0;
              const expH = totalH - incH;
              const isPeak = i === peakBarIdx && total > 0;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    flex: 1,
                    position: "relative",
                  }}
                >
                  {isPeak && (
                    <div
                      style={{
                        position: "absolute",
                        top: -8,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "var(--ink-1)",
                        color: "white",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 10.5,
                        whiteSpace: "nowrap",
                        zIndex: 2,
                        boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                      }}
                    >
                      <div>● Ingresos: {fmt(b.inc, stats?.currency)}</div>
                      <div>● Gastos: -{fmt(b.exp, stats?.currency)}</div>
                    </div>
                  )}
                  <div
                    className="fin-bar"
                    style={{
                      width: 18,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      height: 160,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  >
                    {expH > 0 && (
                      <div
                        style={{
                          width: "100%",
                          height: expH,
                          background: "#E14F4F",
                          borderRadius: "3px 3px 0 0",
                        }}
                      />
                    )}
                    {incH > 0 && (
                      <div
                        style={{
                          width: "100%",
                          height: incH,
                          background: "#1BA84F",
                          borderRadius: expH > 0 ? "0 0 3px 3px" : 3,
                        }}
                      />
                    )}
                  </div>
                  <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
                    {b.d}
                  </span>
                </div>
              );
            })}
          </div>
        </FinCard>

        {/* Aging gauge (semicircle) */}
        <FinCard style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <RiPieChartLine size={15} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              Antigüedad de cuentas por cobrar
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 14,
              position: "relative",
            }}
          >
            <svg width="220" height="130" viewBox="0 0 220 130">
              <defs>
                <linearGradient id="agingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#A8C4F0" />
                  <stop offset="50%" stopColor="#4D7FD3" />
                  <stop offset="100%" stopColor="#9CC2F2" />
                </linearGradient>
              </defs>
              <path
                d="M 20 110 A 90 90 0 0 1 200 110"
                fill="none"
                stroke="#F0EFEB"
                strokeWidth="18"
                strokeLinecap="round"
              />
              {agingTotal > 0 && (
                <path
                  d="M 20 110 A 90 90 0 0 1 200 110"
                  fill="none"
                  stroke="url(#agingGrad)"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
              )}
            </svg>
            <div
              style={{
                position: "absolute",
                top: 60,
                left: "50%",
                transform: "translateX(-50%)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--ink-3)",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                Total
              </div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                {fmt(agingTotal, stats?.currency)}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              marginTop: 4,
            }}
          >
            {[
              {
                Icon: RiCalendarLine,
                color: "#6FB3D2",
                label: "Al día",
                value: stats?.aging.current || 0,
              },
              {
                Icon: RiAlertLine,
                color: "#E14F4F",
                label: "Vencidas",
                value: stats?.overdueInvoices || 0,
              },
              {
                Icon: RiMoneyDollarCircleLine,
                color: "#A8845C",
                label: "Por cobrar",
                value: stats?.pendingInvoices || 0,
              },
            ].map((it, i) => (
              <div
                key={i}
                style={{
                  textAlign: "center",
                  padding: "10px 4px",
                  background: "var(--bg-subtle)",
                  borderRadius: "var(--r-sm)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: 4,
                    color: it.color,
                  }}
                >
                  <it.Icon size={16} />
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                  {it.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                  {fmt(it.value, stats?.currency)}
                </div>
              </div>
            ))}
          </div>
        </FinCard>

        {/* Cash flow projection (line) */}
        <FinCard style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <RiLineChartLine size={15} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              Flujo de caja proyectado
            </span>
          </div>
          <SegPeriod
            value={cashPeriod}
            onChange={setCashPeriod}
            options={["1D", "1W", "1M", "3M", "1Y"]}
          />
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {fmt(cashTotal, stats?.currency)}
              </span>
              {cashTotal > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--success)",
                    fontWeight: 500,
                  }}
                >
                  ↗ Próx. 90 días
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                marginTop: 2,
              }}
            >
              Proyección distribuida en 3 ventanas (30 / 60 / 90 días)
            </div>
          </div>
          <div style={{ position: "relative", marginTop: 12 }}>
            <svg
              width="100%"
              height={H + 10}
              viewBox={`0 -5 ${W} ${H + 10}`}
              preserveAspectRatio="none"
            >
              {linePath && (
                <>
                  <path
                    className="fin-line"
                    d={linePath}
                    fill="none"
                    stroke="#4B6EE8"
                    strokeWidth="1.5"
                  />
                  <circle
                    className="fin-line-peak"
                    cx={peakX}
                    cy={peakY}
                    r="3"
                    fill="#4B6EE8"
                  />
                  <line
                    className="fin-line-peak"
                    x1={peakX}
                    y1={peakY}
                    x2={peakX}
                    y2={H + 5}
                    stroke="var(--line-1)"
                    strokeDasharray="2 2"
                  />
                </>
              )}
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 10,
              fontSize: 11,
              color: "var(--ink-3)",
            }}
          >
            <span>
              30 días {fmt(stats?.cashFlow.next30Days || 0, stats?.currency)}
            </span>
            <span>
              60 días {fmt(stats?.cashFlow.next60Days || 0, stats?.currency)}
            </span>
            <span>
              90 días {fmt(stats?.cashFlow.next90Days || 0, stats?.currency)}
            </span>
          </div>
        </FinCard>
      </div>

      {/* ── Row 2: shortcuts / clients / recent docs ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
        }}
      >
        {/* Shortcuts column (4 stacked buttons) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {shortcuts
            .filter((s) => s.show)
            .map((s, i) => (
              <Link
                key={i}
                href={s.href}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  background: "var(--bg-panel)",
                  border: "1px solid var(--line-1)",
                  borderRadius: "var(--r-md)",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "var(--bg-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <s.Icon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--ink-3)",
                      marginTop: 1,
                    }}
                  >
                    {s.subtitle}
                  </div>
                </div>
                <RiArrowRightSLine size={14} color="var(--ink-3)" />
              </Link>
            ))}
        </div>

        {/* Top clients */}
        <FinCard style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <RiUser3Line size={15} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              Top clientes
            </span>
          </div>
          {stats?.topClients && stats.topClients.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.topClients.slice(0, 5).map((c, i) => (
                <div
                  key={c.id || i}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: AV_COLORS[i % AV_COLORS.length],
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {initials(c.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--ink-3)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.email || `${c.invoiceCount} facturas`}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {fmt(c.total, stats.currency)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              Sin datos de clientes
            </div>
          )}
        </FinCard>

        {/* Recent documents */}
        <FinCard style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
              justifyContent: "space-between",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <RiFileLine size={15} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                Documentos recientes
              </span>
            </div>
            <Link
              href="/dashboard/finance/invoices"
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                textDecoration: "none",
              }}
            >
              Ver todos
            </Link>
          </div>
          {recent.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              No hay documentos recientes
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recent.slice(0, 4).map((d) => {
                const pill = STATUS_PILL[d.status] || {
                  bg: "#EEEAE0",
                  fg: "#6B6660",
                  label: d.status.toUpperCase(),
                };
                return (
                  <div
                    key={d.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "#E8E0FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <RiFileLine size={16} color="#6B4BE0" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {d.number}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--ink-3)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {TYPE_LABEL[d.type] || d.type} —{" "}
                        {d.clientName || "Sin cliente"}
                      </div>
                    </div>
                    <span
                      style={{
                        background: pill.bg,
                        color: pill.fg,
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: ".03em",
                      }}
                    >
                      {pill.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </FinCard>
      </div>
    </div>
  );
}
