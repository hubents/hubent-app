"use client";

import "./funnel.css";
import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUserSession } from "@/hooks/use-user-session";
import { useLeadsKanban, type Lead, type Stage } from "@/hooks/use-leads";
import { CreateLeadDrawer } from "@/components/crm/create-lead-drawer";
import { ContactDrawer } from "@/components/contacts/contact-drawer";
import { StageConfigDrawer } from "@/components/crm/stage-config-drawer";
import { TodoTemplateDrawer } from "@/components/crm/todo-template-drawer";
import { CreateEventDrawer } from "@/components/events/create-event-drawer";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import { hgIcon } from "@/components/ui/hg-icon";
import { Btn } from "@/components/ui/ds";
import { fmtMoney, fmtMoneyShort } from "@/lib/format";
import {
  Search01Icon,
  FilterIcon,
  ArrowDown01Icon,
  Settings01Icon,
  PlusSignIcon,
  Tick01Icon,
  Calendar03Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";

const IcoSearch = hgIcon(Search01Icon);
const IcoFilter = hgIcon(FilterIcon);
const IcoChevDown = hgIcon(ArrowDown01Icon);
const IcoSettings = hgIcon(Settings01Icon);
const IcoPlus = hgIcon(PlusSignIcon);
const IcoCheck = hgIcon(Tick01Icon);
const IcoCalendar = hgIcon(Calendar03Icon);
const IcoClock = hgIcon(Clock01Icon);

// Días desde la última vez que el lead cambió de etapa.
function daysInStage(stageChangedAt: Date | null | undefined, createdAt: Date | null | undefined): { label: string; days: number } | null {
  const ref = stageChangedAt || createdAt;
  if (!ref) return null;
  const t = new Date(ref as unknown as string).getTime();
  if (isNaN(t)) return null;
  const days = Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
  return { label: `${days}D`, days };
}

function daysColor(days: number, yellow: number, red: number): { color: string; bg: string } {
  if (days < yellow)  return { color: "#6B7280", bg: "transparent" };
  if (days < red)     return { color: "#D97706", bg: "#FEF3C7" };
  return               { color: "#E85D4E", bg: "#FEE2E2" };
}

// ============================================================
// KPI cell (idéntico al del dashboard, copiado para encapsular)
// ============================================================
function Kpi({ label, value, sub, delta, deltaTone = "zero" }: {
  label: string;
  value: string | number;
  sub?: string;
  delta?: string;
  deltaTone?: "pos" | "neg" | "zero";
}) {
  const deltaColor =
    deltaTone === "pos"
      ? "var(--success-ink)"
      : deltaTone === "neg"
        ? "var(--danger-ink)"
        : "var(--ink-3)";
  return (
    <div className="px-5 py-4 first:pl-5 not-first:border-l border-[var(--line-1)]">
      <div className="text-[12.5px] text-[var(--ink-3)] font-medium mb-1.5">{label}</div>
      <div className="flex items-baseline gap-2.5">
        <span
          className="text-[26px] font-semibold text-[var(--ink-1)]"
          style={{ letterSpacing: "-0.02em" }}
        >
          {value}
        </span>
        {delta && <span style={{ color: deltaColor }} className="text-[12px] font-medium">{delta}</span>}
      </div>
      {sub && <div className="text-[12px] text-[var(--ink-3)]">{sub}</div>}
    </div>
  );
}

// ============================================================
// Sort dropdown
// ============================================================
type SortKey = "default" | "name-az" | "name-za" | "value-desc" | "value-asc" | "date-asc" | "date-desc";
const SORT_LABELS: Record<SortKey, string> = {
  "default": "Ordenar por",
  "name-az": "A → Z",
  "name-za": "Z → A",
  "value-desc": "Mayor presupuesto",
  "value-asc": "Menor presupuesto",
  "date-asc": "Fecha más cercana",
  "date-desc": "Fecha más lejana",
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
    { group: "Presupuesto", items: [{ v: "value-desc", l: "Mayor a menor" }, { v: "value-asc", l: "Menor a mayor" }] },
    { group: "Fecha", items: [{ v: "date-asc", l: "Fecha más cercana" }, { v: "date-desc", l: "Fecha más lejana" }] },
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
          className="absolute left-0 top-[calc(100%+4px)] min-w-[240px] rounded-[12px] p-1.5 z-50"
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

// ============================================================
// Main page
// ============================================================
export default function CRMPage() {
  return (
    <EventScopedGuard>
      <CRMContent />
    </EventScopedGuard>
  );
}

function CRMContent() {
  const router = useRouter();
  const { stages, loading, moveLead, refetch } = useLeadsKanban();
  const { can } = useUserSession();
  const canManage = can("crm:manage");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [createOpen, setCreateOpen] = useState(false);
  const [createStageId, setCreateStageId] = useState<number | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [todoTemplateOpen, setTodoTemplateOpen] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [alertYellow, setAlertYellow] = useState(4);
  const [alertRed, setAlertRed] = useState(8);

  useEffect(() => {
    fetch("/api/organizations/profile")
      .then((r) => r.json())
      .then((data) => {
        const alerts = data?.settings?.crmAlerts;
        if (alerts) {
          if (typeof alerts.yellow === "number") setAlertYellow(alerts.yellow);
          if (typeof alerts.red === "number") setAlertRed(alerts.red);
        }
      })
      .catch(() => {});
  }, []);
  // Lead que estamos convirtiendo a evento. Cuando hay valor, abrimos el
  // CreateEventDrawer prerrellenado. El usuario decide tipo/template/venue
  // y confirma desde el drawer (no auto-creamos).
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  const dateInput = (d: Date | string | null | undefined) => {
    if (!d) return "";
    const x = new Date(d);
    if (isNaN(x.getTime())) return "";
    return x.toISOString().split("T")[0];
  };

  // Aggregate KPIs
  const allLeads = useMemo(() => stages.flatMap((s) => s.leads), [stages]);
  const wonStage = stages.find((s) => s.isWon);
  const lostStage = stages.find((s) => s.isLost);
  const wonLeads = wonStage?.leads || [];
  const lostLeads = lostStage?.leads || [];
  const activeLeads = allLeads.filter((l) => l.stageId !== wonStage?.id && l.stageId !== lostStage?.id);

  const sumValue = (leads: Lead[]) =>
    leads.reduce((s, l) => s + (l.value ? parseFloat(l.value) : 0), 0);
  const pipelineTotal = sumValue(allLeads);
  const wonValue = sumValue(wonLeads);
  const closed = wonLeads.length + lostLeads.length;
  const convRate = closed > 0 ? Math.round((wonLeads.length / closed) * 100) : 0;

  // Filter + sort leads inside each stage
  const filteredStages = useMemo(() => {
    return stages.map((stage) => {
      let leads = stage.leads;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        leads = leads.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            l.contactName?.toLowerCase().includes(q),
        );
      }
      const numVal = (l: Lead) => (l.value ? parseFloat(l.value) : 0);
      const dateVal = (l: Lead) => l.expectedCloseDate ? new Date(l.expectedCloseDate).getTime() : Number.MAX_SAFE_INTEGER;
      switch (sortBy) {
        case "name-az": leads = [...leads].sort((a, b) => a.title.localeCompare(b.title)); break;
        case "name-za": leads = [...leads].sort((a, b) => b.title.localeCompare(a.title)); break;
        case "value-desc": leads = [...leads].sort((a, b) => numVal(b) - numVal(a)); break;
        case "value-asc": leads = [...leads].sort((a, b) => numVal(a) - numVal(b)); break;
        case "date-asc": leads = [...leads].sort((a, b) => dateVal(a) - dateVal(b)); break;
        case "date-desc": leads = [...leads].sort((a, b) => dateVal(b) - dateVal(a)); break;
      }
      return { ...stage, leads };
    });
  }, [stages, searchQuery, sortBy]);

  const totalAll = useMemo(
    () => filteredStages.reduce((sum, s) => sum + s.leads.length, 0),
    [filteredStages],
  );

  const handleDrop = (stageId: number) => {
    if (!dragId) return;
    moveLead(dragId, stageId);
    setDragId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 rounded-[12px] overflow-hidden"
        style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
      >
        <Kpi
          label="Pipeline Total"
          value={loading ? "—" : fmtMoneyShort(pipelineTotal)}
          delta={`${allLeads.length} oportunidades`}
          deltaTone={pipelineTotal > 0 ? "pos" : "zero"}
          sub="en todas las etapas"
        />
        <Kpi
          label="Leads activos"
          value={loading ? "—" : activeLeads.length}
          delta={activeLeads.length > 0 ? "en pipeline" : "sin leads"}
          deltaTone={activeLeads.length > 0 ? "pos" : "zero"}
          sub="sin contar ganados/perdidos"
        />
        <Kpi
          label="Valor ganado"
          value={loading ? "—" : fmtMoneyShort(wonValue)}
          delta={`${wonLeads.length} cerrado${wonLeads.length !== 1 ? "s" : ""}`}
          deltaTone={wonLeads.length > 0 ? "pos" : "zero"}
          sub="en etapa Ganado"
        />
        <Kpi
          label="Tasa de conversión"
          value={loading ? "—" : `${convRate}%`}
          delta={closed > 0 ? `${wonLeads.length}/${closed} cerrados` : "sin datos"}
          deltaTone={convRate >= 50 ? "pos" : "zero"}
          sub="ganados sobre total cerrados"
        />
      </div>

      {/* Funnel card */}
      <div
        className="rounded-[12px] p-[18px]"
        style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[13px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)]"
            />
          </div>
          <Btn variant="outline">
            <IcoFilter className="h-[14px] w-[14px]" />
            Filtrar
          </Btn>
          <SortDropdown value={sortBy} onChange={setSortBy} />

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {canManage && (
              <Btn variant="outline" onClick={() => setTodoTemplateOpen(true)}>
                <IcoCheck className="h-[14px] w-[14px]" />
                Plantilla tareas
              </Btn>
            )}
            {canManage && (
              <Btn variant="outline" onClick={() => { setSelectedStage(null); setStageDialogOpen(true); }}>
                <IcoSettings className="h-[14px] w-[14px]" />
                Configurar embudo
              </Btn>
            )}
            {canManage && (
              <Btn onClick={() => { setCreateStageId(undefined); setCreateOpen(true); }}>
                <IcoPlus className="h-[14px] w-[14px]" />
                Nuevo Lead
              </Btn>
            )}
          </div>
        </div>

        {/* Funnel chevron columns */}
        {loading ? (
          <div className="text-[13px] text-[var(--ink-3)] py-12 text-center">Cargando…</div>
        ) : filteredStages.length === 0 ? (
          <div className="text-[13px] text-[var(--ink-3)] py-12 text-center">
            Configura tu pipeline antes de empezar
          </div>
        ) : (
          <div className="funnel">
            {filteredStages.map((s) => {
              const stageLeads = s.leads;
              const total = stageLeads.reduce(
                (acc, l) => acc + (l.value ? parseFloat(l.value) : 0),
                0,
              );
              return (
                <div
                  key={s.id}
                  className={`funnel__col ${s.isWon ? "funnel__col--won" : ""} ${s.isLost ? "funnel__col--lost" : ""}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(s.id)}
                >
                  <div className="funnel__arrow">
                    <div className="funnel__label">
                      <span
                        className="funnel-dot"
                        style={{ background: s.color || "#B8B5AE" }}
                      />
                      {s.name}
                    </div>
                    <div className="funnel__amount">{fmtMoney(total)}</div>
                    <div className="funnel__meta">
                      <IcoFilter className="h-[10px] w-[10px]" />
                      {stageLeads.length} de {totalAll} oportunidades
                    </div>
                  </div>
                  <div className="funnel__body">
                    {stageLeads.map((l) => {
                      const prob = l.probability ?? 0;
                      const probColor = prob >= 70 ? "#17A95C" : prob >= 40 ? "#E89C6B" : "#8A8A8A";
                      const probBg = prob >= 70 ? "#E4F2EA" : prob >= 40 ? "#FCE9D9" : "#EDEAE4";
                      const value = l.value ? parseFloat(l.value) : 0;
                      const dateStr = l.expectedCloseDate
                        ? new Date(l.expectedCloseDate).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—";
                      return (
                        <div
                          key={l.id}
                          className="funnel-card"
                          draggable
                          onDragStart={() => setDragId(l.id)}
                          onClick={() => { setSelectedLeadId(l.id); setSelectedContactId(l.contactId ?? null); setDrawerOpen(true); }}
                        >
                          <div className="funnel-card__row">
                            <div className="funnel-card__title">{l.title}</div>
                            {l.assignedUserName && (
                              <div
                                title={l.assignedUserName}
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  background: "#2F7D4F",
                                  color: "white",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 10,
                                  fontWeight: 600,
                                  flexShrink: 0,
                                  border: "1.5px solid white",
                                  boxShadow: "0 0 0 1px var(--line-strong)",
                                }}
                              >
                                {l.assignedUserName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div
                            className="funnel-card__row"
                            style={{ justifyContent: "space-between", marginTop: 6 }}
                          >
                            <span className="funnel-card__val">{fmtMoney(value)}</span>
                            <span
                              className="funnel-card__prob"
                              style={{ background: probBg, color: probColor }}
                            >
                              {prob}%
                            </span>
                          </div>
                          <div
                            className="funnel-card__row"
                            style={{ justifyContent: "space-between", marginTop: 4 }}
                          >
                            <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{dateStr}</span>
                            {(() => {
                              const d = daysInStage(l.stageChangedAt, l.createdAt);
                              if (!d) return null;
                              const clr = daysColor(d.days, alertYellow, alertRed);
                              return (
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    color: clr.color,
                                    background: clr.bg,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    borderRadius: 4,
                                    padding: d.days >= alertYellow ? "1px 5px" : undefined,
                                    fontWeight: d.days >= alertRed ? 600 : 500,
                                  }}
                                  title={`${d.days} día${d.days !== 1 ? "s" : ""} en esta etapa`}
                                >
                                  <IcoClock className="h-[10px] w-[10px]" />
                                  {d.label}
                                </span>
                              );
                            })()}
                          </div>
                          {l.contactName && (
                            <div
                              style={{
                                fontSize: 10.5,
                                color: "var(--ink-3)",
                                marginTop: 2,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={l.contactName}
                            >
                              {l.contactName}
                            </div>
                          )}
                          {s.isWon && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConvertingLead(l);
                              }}
                              style={{
                                marginTop: 8,
                                width: "100%",
                                padding: "5px 8px",
                                border: "1px solid var(--color-primary)",
                                borderRadius: "var(--r-sm)",
                                background: "transparent",
                                color: "var(--color-primary)",
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 5,
                              }}
                            >
                              <IcoCalendar className="h-3 w-3" />
                              Convertir en evento
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {stageLeads.length === 0 && (
                      <div className="funnel-card__empty">Arrastra aquí</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawers (preserved from original implementation) */}
      <CreateLeadDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onLeadCreated={refetch}
        stageId={createStageId}
      />

      <ContactDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        contactId={selectedContactId}
        leadId={selectedLeadId}
        leadStages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
        onLeadUpdated={refetch}
        onLeadDeleted={refetch}
      />

      <StageConfigDrawer
        open={stageDialogOpen}
        onOpenChange={setStageDialogOpen}
        stages={stages}
        onStagesChanged={refetch}
      />

      <TodoTemplateDrawer
        open={todoTemplateOpen}
        onOpenChange={setTodoTemplateOpen}
      />

      {/* Convertir lead → evento. Abre el CreateEventDrawer prerrellenado
          con datos del lead. El usuario elige tipo/template/venue, confirma
          desde el drawer y navegamos al evento creado. El lead permanece
          en su etapa (no se borra). */}
      <CreateEventDrawer
        open={!!convertingLead}
        onOpenChange={(open) => { if (!open) setConvertingLead(null); }}
        prefill={
          convertingLead
            ? {
                name: convertingLead.title,
                date: dateInput(convertingLead.expectedCloseDate),
                budget: convertingLead.value || "",
                description: convertingLead.description || "",
              }
            : undefined
        }
        onEventCreated={(created) => {
          const leadTitle = convertingLead?.title;
          setConvertingLead(null);
          if (leadTitle) toast.success(`Evento "${leadTitle}" creado`);
          if (created?.id) {
            router.push(`/dashboard/events/${created.id}`);
          }
        }}
      />
    </div>
  );
}
