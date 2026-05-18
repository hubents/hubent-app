"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Search01Icon,
  Cancel01Icon,
  PencilEdit02Icon,
  Delete01Icon,
  VideoReplayIcon,
  Camera01Icon,
  MusicNote01Icon,
  Package01Icon,
  ArrowRight01Icon,
  CalendarCheckIn01Icon,
  Share01Icon,
  Copy01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { fmtMoney as fmt } from "@/lib/format";

// ── Icon wrappers ─────────────────────────────────────────────────────────────
const IcoPlus   = ({ size = 14 }) => <HugeiconsIcon icon={PlusSignIcon}          size={size} strokeWidth={1.5} />;
const IcoSearch = ({ size = 14 }) => <HugeiconsIcon icon={Search01Icon}          size={size} strokeWidth={1.5} />;
const IcoX      = ({ size = 16 }) => <HugeiconsIcon icon={Cancel01Icon}          size={size} strokeWidth={1.5} />;
const IcoEdit   = ({ size = 14 }) => <HugeiconsIcon icon={PencilEdit02Icon}      size={size} strokeWidth={1.5} />;
const IcoTrash  = ({ size = 14 }) => <HugeiconsIcon icon={Delete01Icon}          size={size} strokeWidth={1.5} />;
const IcoVideo  = ({ size = 20 }) => <HugeiconsIcon icon={VideoReplayIcon}       size={size} strokeWidth={1.5} />;
const IcoCam    = ({ size = 20 }) => <HugeiconsIcon icon={Camera01Icon}          size={size} strokeWidth={1.5} />;
const IcoMusic  = ({ size = 20 }) => <HugeiconsIcon icon={MusicNote01Icon}       size={size} strokeWidth={1.5} />;
const IcoPack   = ({ size = 20 }) => <HugeiconsIcon icon={Package01Icon}         size={size} strokeWidth={1.5} />;
const IcoArrow  = ({ size = 14 }) => <HugeiconsIcon icon={ArrowRight01Icon}      size={size} strokeWidth={1.5} />;
const IcoCal    = ({ size = 20 }) => <HugeiconsIcon icon={CalendarCheckIn01Icon} size={size} strokeWidth={1.5} />;
const IcoShare  = ({ size = 14 }) => <HugeiconsIcon icon={Share01Icon}           size={size} strokeWidth={1.5} />;
const IcoCopy   = ({ size = 13 }) => <HugeiconsIcon icon={Copy01Icon}            size={size} strokeWidth={1.5} />;
const IcoDone   = ({ size = 14 }) => <HugeiconsIcon icon={CheckmarkCircle01Icon} size={size} strokeWidth={1.5} />;
const IcoClock  = ({ size = 13 }) => <HugeiconsIcon icon={Clock01Icon}           size={size} strokeWidth={1.5} />;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Service {
  id: number;
  sku: string | null;
  name: string;
  type: string | null;
  subtype: string | null;
  category: string | null;
  description: string | null;
  cost: string | null;
  unitPrice: string | null;
  taxRate: string | null;
  color: string | null;
  initials: string | null;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  dueDate: string | null;
  eventId: number | null;
  eventName?: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const AV_CATEGORIES = [
  "Fotografía", "Vídeo", "DJ y música", "Iluminación de espectáculo",
  "Drones y aéreo", "Transmisión en vivo", "Edición y posproducción",
  "Equipamiento AV", "Otros",
];
const VAT_RATES = [0, 4, 10, 21];
const AV_COLORS = ["#5B8FE8", "#9B7EDB", "#C97A7A", "#4F7A5E", "#C49A3C", "#7B8FA1", "#C4874A"];

const SUBTYPE_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  alquiler: { bg: "#D9ECD1", fg: "#1F6A3A", label: "Alquiler" },
  venta:    { bg: "#FEF3CD", fg: "#8A6D00", label: "Venta" },
  servicio: { bg: "#EDE7DC", fg: "#5C4A2E", label: "Servicio" },
};

const TASK_STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  pending:     { bg: "#E8EEF6", fg: "#4A6A94" },
  in_progress: { bg: "#FEF3CD", fg: "#8A6D00" },
  done:        { bg: "#D9ECD1", fg: "#1F6A3A" },
  cancelled:   { bg: "#FBEDEC", fg: "#B55450" },
};

const totalWithVat = (price: string | null, vat: string | null): number | null => {
  if (price == null || vat == null) return null;
  return Number(price) * (1 + Number(vat) / 100);
};

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ color, initials, size = 36 }: { color: string | null; initials: string | null; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size / 3, background: color || "#5B8FE8", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: size * 0.33, flexShrink: 0 }}>
      {initials || "?"}
    </div>
  );
}

function Pill({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 500, background: bg, color: fg, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function ColorPicker({ value, onChange, colors }: { value: string; onChange: (c: string) => void; colors: string[] }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {colors.map(c => (
        <button key={c} onClick={() => onChange(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: value === c ? "3px solid var(--ink-1)" : "2px solid transparent", cursor: "pointer", outline: "none" }} />
      ))}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", marginTop: 10, paddingBottom: 4, borderBottom: "1px solid var(--line-1)" }}>{label}</div>;
}

// ════════════════════════════════════════════════════════════════════════════════
// SERVICE DRAWER
// ════════════════════════════════════════════════════════════════════════════════
interface ServiceDrawerProps {
  initial?: Service | null;
  onSave: (data: Partial<Service>) => Promise<void>;
  onClose: () => void;
}

function ServiceDrawer({ initial, onSave, onClose }: ServiceDrawerProps) {
  const t = useTranslations("audiovisual");
  const editing = !!initial;
  const [form, setForm] = useState({
    name: initial?.name || "",
    sku: initial?.sku || "",
    category: initial?.category || "Fotografía",
    description: initial?.description || "",
    cost: initial?.cost || "",
    unitPrice: initial?.unitPrice || "",
    taxRate: initial?.taxRate || "21",
    color: initial?.color || "#5B8FE8",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const total = form.unitPrice && form.taxRate ? totalWithVat(form.unitPrice, form.taxRate) : null;

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const initials = form.name.split(" ").filter(Boolean).map((w: string) => w[0].toUpperCase()).slice(0, 2).join("");
      await onSave({ ...form, initials, type: "servicio", subtype: "servicio" });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.35)", zIndex: 60, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 440, background: "var(--bg-panel)", borderTopLeftRadius: 16, borderBottomLeftRadius: 16, padding: "22px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>

        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "var(--r-sm)", background: "var(--bg-subtle)", border: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IcoCam size={18} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>{editing ? t("editService") : t("newService")}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>{t("serviceCatalogSubtitle")}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4, borderRadius: 6, display: "flex" }}><IcoX /></button>
        </div>

        <SectionDivider label={t("sectionInfo")} />
        <div className="form-field"><label>{t("nameLabel")}</label><input value={form.name} onChange={e => set("name", e.target.value)} placeholder={t("namePlaceholder")} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="form-field">
            <label>{t("skuLabel")}</label>
            <input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="FOT-BOD-FD-01" />
          </div>
          <div className="form-field">
            <label>{t("categoryLabel")}</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}>
              {AV_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="form-field">
          <label>{t("descriptionLabel")}</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder={t("descriptionPlaceholder")} style={{ resize: "vertical", minHeight: 70 }} />
        </div>

        <SectionDivider label={t("sectionPrices")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="form-field"><label>{t("costLabel")}</label><input type="number" min="0" step="0.01" value={form.cost} onChange={e => set("cost", e.target.value)} placeholder="0.00" /></div>
          <div className="form-field"><label>{t("salePriceLabel")}</label><input type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => set("unitPrice", e.target.value)} placeholder="0.00" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="form-field">
            <label>{t("vatLabel")}</label>
            <select value={form.taxRate} onChange={e => set("taxRate", e.target.value)}>
              {VAT_RATES.map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>{t("totalWithVatLabel")}</label>
            <div style={{ padding: "8px 10px", background: "var(--bg-subtle)", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>
              {total != null ? fmt(total) : "—"}
            </div>
          </div>
        </div>

        <SectionDivider label={t("sectionAvatarColor")} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar color={form.color} initials={form.name.split(" ").filter(Boolean).map((w: string) => w[0].toUpperCase()).slice(0, 2).join("") || "?"} size={40} />
          <ColorPicker value={form.color} onChange={c => set("color", c)} colors={AV_COLORS} />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end", paddingTop: 12, borderTop: "1px solid var(--line-1)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "var(--bg-panel)", color: "var(--ink-2)", fontSize: 13, cursor: "pointer" }}>{t("cancelBtn")}</button>
          <button onClick={handleSave} disabled={!form.name.trim() || saving} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "none", background: "var(--ink-1)", color: "white", fontSize: 13, fontWeight: 500, cursor: form.name.trim() ? "pointer" : "not-allowed", opacity: !form.name.trim() ? 0.5 : 1 }}>
            {saving ? t("savingBtn") : editing ? t("saveChangesBtn") : t("createServiceBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// SERVICES TAB
// ════════════════════════════════════════════════════════════════════════════════
function ServicesTab() {
  const t = useTranslations("audiovisual");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("Todas");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<Service | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products?type=servicio");
      const data = await res.json();
      if (data.success) setServices(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const allCats = useMemo(() => ["Todas", ...Array.from(new Set(services.map(s => s.category).filter((c): c is string => c != null)))], [services]);

  const filtered = useMemo(() => {
    let list = services;
    if (catFilter !== "Todas") list = list.filter(s => s.category === catFilter);
    if (q.trim()) {
      const term = q.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(term) ||
        (s.sku || "").toLowerCase().includes(term) ||
        (s.category || "").toLowerCase().includes(term)
      );
    }
    return list;
  }, [services, catFilter, q]);

  const handleSave = async (data: Partial<Service>) => {
    if (editItem) {
      await fetch(`/api/products/${editItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      toast.success(t("serviceUpdated"));
    } else {
      await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      toast.success(t("serviceCreated"));
    }
    setEditItem(null);
    fetchServices();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    toast.success(t("serviceDeleted"));
    fetchServices();
  };

  // Category icon
  const catIcon = (cat: string | null) => {
    if (!cat) return <IcoPack size={16} />;
    if (cat.toLowerCase().includes("foto")) return <IcoCam size={16} />;
    if (cat.toLowerCase().includes("vid") || cat.toLowerCase().includes("drone")) return <IcoVideo size={16} />;
    if (cat.toLowerCase().includes("dj") || cat.toLowerCase().includes("mús")) return <IcoMusic size={16} />;
    return <IcoPack size={16} />;
  };

  if (loading) return <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-3)" }}>{t("loadingServices")}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {allCats.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} style={{ padding: "5px 12px", borderRadius: 999, border: `1.5px solid ${catFilter === c ? "var(--ink-1)" : "var(--line-1)"}`, background: catFilter === c ? "var(--ink-1)" : "var(--bg-panel)", color: catFilter === c ? "white" : "var(--ink-2)", fontSize: 12, fontWeight: catFilter === c ? 600 : 400, cursor: "pointer" }}>
              {c}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Búsqueda */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", pointerEvents: "none", display: "flex" }}><IcoSearch /></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("searchServicesPlaceholder")} style={{ paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", background: "var(--bg-panel)", fontSize: 12.5, width: 180, color: "var(--ink-1)", outline: "none" }} />
        </div>

        <button onClick={() => { setEditItem(null); setDrawerOpen(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--ink-1)", color: "white", border: "none", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <IcoPlus size={13} /> {t("newServiceBtn")}
        </button>
      </div>

      {/* Grid de servicios */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, opacity: 0.3 }}><IcoCam size={40} /></div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-2)", marginBottom: 6 }}>
            {services.length === 0 ? t("noServicesYet") : t("noServicesMatch")}
          </div>
          {services.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 16 }}>{t("noServicesHint")}</div>
          )}
          {services.length === 0 && (
            <button onClick={() => setDrawerOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--ink-1)", color: "white", border: "none", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              <IcoPlus size={13} /> {t("createFirstServiceBtn")}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {filtered.map(s => {
            const total = totalWithVat(s.unitPrice, s.taxRate);
            return (
              <div key={s.id} style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: 14, overflow: "hidden", transition: "box-shadow .12s" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "var(--shadow-pop)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
              >
                {/* Color top stripe */}
                <div style={{ height: 6, background: s.color || "#5B8FE8" }} />
                <div style={{ padding: 16 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
                    <Avatar color={s.color} initials={s.initials} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: 6 }}>{s.name}</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                        {s.category && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-3)", background: "var(--bg-subtle)", border: "1px solid var(--line-1)", padding: "2px 8px", borderRadius: 999 }}>
                            {catIcon(s.category)} {s.category}
                          </span>
                        )}
                        {s.sku && <span style={{ fontFamily: "monospace", fontSize: 10.5, color: "var(--ink-4)" }}>{s.sku}</span>}
                      </div>
                    </div>
                  </div>

                  {s.description && (
                    <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 10, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>
                      {s.description}
                    </p>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--line-1)" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{t("totalWithVatShort")}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink-1)" }}>{fmt(total)}</div>
                      {s.cost && <div style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 1 }}>{t("costShort")}{fmt(s.cost)}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => { setEditItem(s); setDrawerOpen(true); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 8px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "transparent", color: "var(--ink-2)", cursor: "pointer" }}>
                        <IcoEdit size={13} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 8px", borderRadius: "var(--r-sm)", border: "none", background: "#FBEDEC", color: "#B55450", cursor: "pointer" }}>
                        <IcoTrash size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats footer */}
      {services.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
          {filtered.length} {filtered.length === 1 ? t("serviceSingular") : t("servicePlural")}
          {filtered.length !== services.length && ` de ${services.length} totales`}
        </div>
      )}

      {drawerOpen && (
        <ServiceDrawer
          initial={editItem}
          onSave={handleSave}
          onClose={() => { setDrawerOpen(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// AGENDA TAB — Upcoming tasks / projects
// ════════════════════════════════════════════════════════════════════════════════
function AgendaTab() {
  const t = useTranslations("audiovisual");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function fetchTasks() {
      setLoading(true);
      try {
        const res = await fetch("/api/tasks?limit=50");
        const data = await res.json();
        if (data.success) setTasks(data.data || []);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return tasks;
    return tasks.filter(tk => tk.status === statusFilter);
  }, [tasks, statusFilter]);

  const STATUS_TABS = [
    { id: "all",         label: t("filterAll") },
    { id: "pending",     label: t("filterPending") },
    { id: "in_progress", label: t("filterInProgress") },
    { id: "done",        label: t("filterDone") },
  ];

  if (loading) return <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-3)" }}>{t("loadingAgenda")}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 2, background: "var(--bg-subtle)", borderRadius: "var(--r-sm)", padding: 3, border: "1px solid var(--line-1)", width: "fit-content" }}>
        {STATUS_TABS.map(tb => (
          <button key={tb.id} onClick={() => setStatusFilter(tb.id)} style={{ padding: "5px 12px", borderRadius: "var(--r-sm)", border: "none", cursor: "pointer", background: statusFilter === tb.id ? "var(--bg-panel)" : "transparent", boxShadow: statusFilter === tb.id ? "var(--shadow-1)" : "none", color: statusFilter === tb.id ? "var(--ink-1)" : "var(--ink-3)", fontSize: 12.5, fontWeight: statusFilter === tb.id ? 600 : 400 }}>
            {tb.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, opacity: 0.3 }}><IcoCal size={40} /></div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-2)", marginBottom: 6 }}>
            {tasks.length === 0 ? t("noProjectsYet") : t("noProjectsMatch")}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {t("projectsHint")}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(task => {
            const s = TASK_STATUS_STYLE[task.status || "pending"] || TASK_STATUS_STYLE.pending;
            const statusLabel: Record<string, string> = { pending: t("filterPending"), in_progress: t("filterInProgress"), done: t("filterDone"), cancelled: t("filterCancelled") };
            const sLabel = statusLabel[task.status || "pending"] || (task.status || "pending");
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
            return (
              <div key={task.id} style={{ background: "var(--bg-panel)", border: `1px solid ${isOverdue ? "#E8A0A0" : "var(--line-1)"}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                {/* Status dot */}
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.fg, flexShrink: 0 }} />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{task.title}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {task.eventName && (
                      <span style={{ fontSize: 12, color: "var(--ink-3)" }}>📅 {task.eventName}</span>
                    )}
                    {task.dueDate && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: isOverdue ? "#B55450" : "var(--ink-3)" }}>
                        <IcoClock size={12} />
                        {new Date(task.dueDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                        {isOverdue && t("overdueLabel")}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.description}</div>
                  )}
                </div>

                {/* Status pill */}
                <Pill bg={s.bg} fg={s.fg}>{sLabel}</Pill>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// DELIVERIES TAB — Client gallery / file delivery
// ════════════════════════════════════════════════════════════════════════════════

interface DeliveryLink {
  id: string;
  clientName: string;
  eventName: string;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  views: number;
}

function DeliveriesTab() {
  const t = useTranslations("audiovisual");
  // Local state for demo/placeholder deliveries (no DB backing yet)
  const [deliveries, setDeliveries] = useState<DeliveryLink[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ clientName: "", eventName: "", url: "", expiresAt: "" });

  const handleCreate = () => {
    if (!form.clientName.trim() || !form.url.trim()) return;
    const newDelivery: DeliveryLink = {
      id: Date.now().toString(),
      clientName: form.clientName,
      eventName: form.eventName,
      url: form.url,
      createdAt: new Date().toISOString(),
      expiresAt: form.expiresAt || null,
      views: 0,
    };
    setDeliveries(d => [newDelivery, ...d]);
    setForm({ clientName: "", eventName: "", url: "", expiresAt: "" });
    setCreateOpen(false);
    toast.success(t("deliveryCreated"));
  };

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
      toast.success(t("urlCopied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const handleDelete = (id: string) => {
    setDeliveries(d => d.filter(dl => dl.id !== id));
    toast.success(t("linkDeleted"));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Info banner */}
      <div style={{ background: "#EEF6FF", border: "1px solid #BFDBFE", borderRadius: "var(--r-sm)", padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
        <div style={{ fontSize: 12.5, color: "#3A5B8A", lineHeight: 1.55 }}>
          <strong>{t("infoBannerTitle")}</strong> {t("infoBannerDesc")}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setCreateOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--ink-1)", color: "white", border: "none", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <IcoPlus size={13} /> {t("newDeliveryLinkBtn")}
        </button>
      </div>

      {deliveries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📎</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-2)", marginBottom: 6 }}>{t("noDeliveriesYet")}</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{t("noDeliveriesHint")}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {deliveries.map(dl => {
            const isExpired = dl.expiresAt && new Date(dl.expiresAt) < new Date();
            return (
              <div key={dl.id} style={{ background: "var(--bg-panel)", border: `1px solid ${isExpired ? "#E8A0A0" : "var(--line-1)"}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: isExpired ? "#FDF0EF" : "#EEF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>
                  {isExpired ? "⚠️" : "🖼️"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>{dl.clientName}</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {dl.eventName && <span style={{ fontSize: 12, color: "var(--ink-3)" }}>📅 {dl.eventName}</span>}
                    <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                      🕐 {new Date(dl.createdAt).toLocaleDateString("es-ES")}
                    </span>
                    {dl.expiresAt && (
                      <span style={{ fontSize: 12, color: isExpired ? "#B55450" : "var(--ink-3)" }}>
                        {isExpired ? t("expiredLabel") : `${t("expiresLabel")}${new Date(dl.expiresAt).toLocaleDateString("es-ES")}`}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: "var(--ink-4)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{dl.url}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => handleCopy(dl.url, dl.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: copied === dl.id ? "#D9ECD1" : "var(--bg-panel)", color: copied === dl.id ? "#1F6A3A" : "var(--ink-2)", fontSize: 12, cursor: "pointer", transition: "all .15s" }}>
                    {copied === dl.id ? <IcoDone size={13} /> : <IcoCopy />}
                    {copied === dl.id ? t("copiedBtn") : t("copyBtn")}
                  </button>
                  <a href={dl.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "var(--bg-panel)", color: "var(--ink-2)", fontSize: 12, cursor: "pointer", textDecoration: "none" }}>
                    <IcoShare size={13} /> {t("openBtn")}
                  </a>
                  <button onClick={() => handleDelete(dl.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 8px", borderRadius: "var(--r-sm)", border: "none", background: "#FBEDEC", color: "#B55450", cursor: "pointer" }}>
                    <IcoTrash size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create drawer */}
      {createOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.35)", zIndex: 60, display: "flex", justifyContent: "flex-end" }} onClick={() => setCreateOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, background: "var(--bg-panel)", borderTopLeftRadius: 16, borderBottomLeftRadius: 16, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>{t("newDeliveryDrawerTitle")}</div>
              <button onClick={() => setCreateOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4, borderRadius: 6, display: "flex" }}><IcoX /></button>
            </div>

            <div className="form-field">
              <label>{t("clientNameLabel")}</label>
              <input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder={t("clientNamePlaceholder")} autoFocus />
            </div>
            <div className="form-field">
              <label>{t("eventLabel")}</label>
              <input value={form.eventName} onChange={e => setForm(f => ({ ...f, eventName: e.target.value }))} placeholder={t("eventPlaceholder")} />
            </div>
            <div className="form-field">
              <label>{t("galleryUrlLabel")}</label>
              <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder={t("galleryUrlPlaceholder")} />
              <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>{t("galleryUrlHint")}</div>
            </div>
            <div className="form-field">
              <label>{t("expiryDateLabel")} <span style={{ color: "var(--ink-4)", fontWeight: 400 }}>{t("expiryOptional")}</span></label>
              <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 12, borderTop: "1px solid var(--line-1)" }}>
              <button onClick={() => setCreateOpen(false)} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "var(--bg-panel)", color: "var(--ink-2)", fontSize: 13, cursor: "pointer" }}>{t("cancelDrawerBtn")}</button>
              <button onClick={handleCreate} disabled={!form.clientName.trim() || !form.url.trim()} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "none", background: "var(--ink-1)", color: "white", fontSize: 13, fontWeight: 500, cursor: (form.clientName.trim() && form.url.trim()) ? "pointer" : "not-allowed", opacity: (!form.clientName.trim() || !form.url.trim()) ? 0.5 : 1 }}>
                {t("createLinkBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
type Tab = "services" | "agenda" | "deliveries";

export default function AudiovisualPage() {
  const t = useTranslations("audiovisual");
  const [activeTab, setActiveTab] = useState<Tab>("services");

  const TABS: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "services",   label: t("tabServices"),   icon: <IcoCam size={16} />,   desc: t("tabServicesDesc") },
    { id: "agenda",     label: t("tabAgenda"),     icon: <IcoCal size={16} />,   desc: t("tabAgendaDesc") },
    { id: "deliveries", label: t("tabDeliveries"), icon: <IcoShare size={16} />, desc: t("tabDeliveriesDesc") },
  ];

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>{t("pageTitle")}</h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4, marginBottom: 0 }}>
          {t("pageSubtitle")}
        </p>
      </div>

      {/* Tab cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24, maxWidth: 560 }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setActiveTab(tb.id)} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${activeTab === tb.id ? "var(--ink-1)" : "var(--line-1)"}`, background: activeTab === tb.id ? "var(--bg-subtle)" : "var(--bg-panel)", cursor: "pointer", textAlign: "left", transition: "all .12s" }}>
            <div style={{ color: activeTab === tb.id ? "var(--ink-1)" : "var(--ink-3)" }}>{tb.icon}</div>
            <div style={{ fontSize: 13, fontWeight: activeTab === tb.id ? 700 : 500, color: activeTab === tb.id ? "var(--ink-1)" : "var(--ink-2)" }}>{tb.label}</div>
            <div style={{ fontSize: 11, color: "var(--ink-4)", lineHeight: 1.3 }}>{tb.desc}</div>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "services"   && <ServicesTab />}
      {activeTab === "agenda"     && <AgendaTab />}
      {activeTab === "deliveries" && <DeliveriesTab />}
    </div>
  );
}
