"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Search01Icon,
  Delete01Icon,
  PencilEdit02Icon,
  Cancel01Icon,
  Package01Icon,
  TruckIcon,
  Archive01Icon,
  ArrowUpDownIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";

// ── Icon wrappers ─────────────────────────────────────────────────────────────
const IcoPlus  = ({ size = 14 }: { size?: number }) => <HugeiconsIcon icon={PlusSignIcon}          size={size} strokeWidth={1.5} />;
const IcoSearch= ({ size = 14 }: { size?: number }) => <HugeiconsIcon icon={Search01Icon}          size={size} strokeWidth={1.5} />;
const IcoTrash = ({ size = 14 }: { size?: number }) => <HugeiconsIcon icon={Delete01Icon}          size={size} strokeWidth={1.5} />;
const IcoEdit  = ({ size = 14 }: { size?: number }) => <HugeiconsIcon icon={PencilEdit02Icon}      size={size} strokeWidth={1.5} />;
const IcoX     = ({ size = 16 }: { size?: number }) => <HugeiconsIcon icon={Cancel01Icon}          size={size} strokeWidth={1.5} />;
const IcoProd  = ({ size = 20 }: { size?: number }) => <HugeiconsIcon icon={Package01Icon}         size={size} strokeWidth={1.5} />;
const IcoWh    = ({ size = 20 }: { size?: number }) => <HugeiconsIcon icon={Archive01Icon}         size={size} strokeWidth={1.5} />;
const IcoMov   = ({ size = 20 }: { size?: number }) => <HugeiconsIcon icon={ArrowUpDownIcon}       size={size} strokeWidth={1.5} />;
const IcoDone  = ({ size = 14 }: { size?: number }) => <HugeiconsIcon icon={CheckmarkCircle01Icon} size={size} strokeWidth={1.5} />;
const IcoTruck = ({ size = 22 }: { size?: number }) => <HugeiconsIcon icon={TruckIcon}             size={size} strokeWidth={1.5} />;
const IcoAlert = ({ size = 13 }: { size?: number }) => <HugeiconsIcon icon={AlertCircleIcon}       size={size} strokeWidth={2} />;

// ── Types ─────────────────────────────────────────────────────────────────────
type ProductType    = "fisico" | "servicio" | "paquete";
type ProductSubtype = "alquiler" | "venta" | "servicio";
type LogisticsStatus = "pendiente" | "confirmada" | "en_ruta" | "entregada" | "devuelta" | "cancelada";

interface Product {
  id: number;
  sku: string | null;
  name: string;
  type: ProductType | null;
  subtype: ProductSubtype | null;
  category: string | null;
  tags: string[] | null;
  description: string | null;
  detail: string | null;
  cost: string | null;
  unitPrice: string | null;
  taxRate: string | null;
  stock: number | null;
  stockMin: number | null;
  warehouseId: number | null;
  warehouseName: string | null;
  color: string | null;
  initials: string | null;
  isActive: boolean | null;
}

interface Warehouse {
  id: number;
  name: string;
  type: "fijo" | "movil" | null;
  location: string | null;
  capacity: number | null;
  manager: string | null;
  plate: string | null;
  driver: string | null;
  color: string | null;
  initials: string | null;
  eventId: number | null;
  eventName: string | null;
}

interface StockMovement {
  id: number;
  type: string;
  productId: number;
  productName: string | null;
  quantity: number;
  date: string | null;
  warehouseId: number | null;
  warehouseName: string | null;
  fromWarehouseId: number | null;
  toWarehouseId: number | null;
  eventId: number | null;
  eventName: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string | null;
}

interface ReservationItem {
  id: number;
  reservationId: number;
  productId: number;
  productName: string;
  productColor: string | null;
  productInitials: string | null;
  quantity: number;
  notes: string | null;
}

interface Reservation {
  id: number;
  organizationId: number;
  eventId: number | null;
  eventName: string | null;
  date: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  warehouseId: number | null;
  warehouseName: string | null;
  warehouseColor: string | null;
  warehouseType: "fijo" | "movil" | null;
  itemsLocation: string | null;
  venue: string | null;
  venueCity: string | null;
  status: LogisticsStatus | null;
  notes: string | null;
  createdAt: string | null;
  items: ReservationItem[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PRODUCT_CATEGORIES = [
  "Mobiliario", "Decoración", "Textil", "Iluminación", "Audiovisual",
  "Florística", "Catering y menaje", "Fotografía y vídeo", "Coordinación", "Transporte", "Otros",
];
const VAT_RATES = [0, 4, 10, 21];
const PRODUCT_COLORS = ["#7B8FA1", "#8B7252", "#C4A882", "#A8B5A0", "#E8C97E", "#B0A8C4", "#5B8FE8", "#C4A040", "#4F7A5E"];
const WH_COLORS = ["#4F7A5E", "#7B6FAA", "#C4874A", "#5B8FE8", "#C97A7A", "#7B8FA1", "#C49A3C"];

const MOVE_TYPE_STYLE: Record<string, { label: string; color: string; bg: string; sign: string }> = {
  entrada:       { label: "Entrada",       color: "#4F7A5E", bg: "#EDF5EE", sign: "+" },
  salida:        { label: "Salida",        color: "#B55450", bg: "#FBEDEC", sign: "−" },
  transferencia: { label: "Transferencia", color: "#4A6A94", bg: "#E8EEF6", sign: "⇄" },
  reserva:       { label: "Reserva",       color: "#7B5EA7", bg: "#F0EBF8", sign: "◷" },
  carga:         { label: "Carga",         color: "#C4874A", bg: "#FBF4E3", sign: "▲" },
  entrega:       { label: "Entrega",       color: "#4F7A5E", bg: "#EDF5EE", sign: "✓" },
  devolucion:    { label: "Devolución",    color: "#4A6A94", bg: "#E8EEF6", sign: "↩" },
  ajuste:        { label: "Ajuste",        color: "#B88325", bg: "#FBF4E3", sign: "≈" },
};

const STATUS_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  pendiente:  { label: "Pendiente",  bg: "#FBF4E3", fg: "#B88325" },
  confirmada: { label: "Confirmada", bg: "#E8EEF6", fg: "#4A6A94" },
  en_ruta:    { label: "En ruta",    bg: "#FBF4E3", fg: "#C4874A" },
  entregada:  { label: "Entregada",  bg: "#EDF5EE", fg: "#4F7A5E" },
  devuelta:   { label: "Devuelta",   bg: "#EDE7DC", fg: "#5C4A2E" },
  cancelada:  { label: "Cancelada",  bg: "#FBEDEC", fg: "#B55450" },
};

// ── Shared helpers ─────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ color, initials, size = 36 }: { color: string | null; initials: string | null; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size / 3.5, background: color || "#7B8FA1", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: size * 0.33, flexShrink: 0 }}>
      {initials || "?"}
    </div>
  );
}

// ── Pill ──────────────────────────────────────────────────────────────────────
function Pill({ bg, fg, children, onClick }: { bg: string; fg: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <span
      onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 500, background: bg, color: fg, whiteSpace: "nowrap", cursor: onClick ? "pointer" : "default" }}
    >
      {children}
    </span>
  );
}

// ── Color picker ───────────────────────────────────────────────────────────────
function ColorPicker({ value, onChange, colors }: { value: string; onChange: (c: string) => void; colors: string[] }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {colors.map(c => (
        <button key={c} onClick={() => onChange(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: value === c ? "3px solid var(--ink-1)" : "2px solid transparent", cursor: "pointer", outline: "none" }} />
      ))}
    </div>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return <div style={{ fontSize: 10.5, textTransform: "uppercase" as const, letterSpacing: ".08em", color: "var(--ink-3)", marginTop: 10, paddingBottom: 4, borderBottom: "1px solid var(--line-1)" }}>{label}</div>;
}

// ════════════════════════════════════════════════════════════════════════════════
// PRODUCT DRAWER
// ════════════════════════════════════════════════════════════════════════════════
function ProductDrawer({ initial, warehouses: whs, onSave, onClose }: {
  initial?: Product | null;
  warehouses: Warehouse[];
  onSave: (data: Partial<Product>) => Promise<void>;
  onClose: () => void;
}) {
  const t = useTranslations("logistics");
  const editing = !!initial;
  const [form, setForm] = useState({
    name: initial?.name || "",
    sku: initial?.sku || "",
    type: (initial?.type || "fisico") as ProductType,
    subtype: (initial?.subtype || "alquiler") as ProductSubtype,
    category: initial?.category || "Mobiliario",
    description: initial?.description || "",
    cost: initial?.cost || "",
    unitPrice: initial?.unitPrice || "",
    taxRate: initial?.taxRate || "21",
    stock: initial?.stock?.toString() || "",
    stockMin: initial?.stockMin?.toString() || "",
    warehouseId: initial?.warehouseId?.toString() || "",
    color: initial?.color || "#7B8FA1",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const initials = form.name.split(" ").filter(Boolean).map((w: string) => w[0].toUpperCase()).slice(0, 2).join("");
      await onSave({
        ...form,
        initials,
        warehouseId: form.warehouseId ? Number(form.warehouseId) : undefined,
        cost: form.cost || undefined,
        unitPrice: form.unitPrice || undefined,
        stock: form.stock ? Number(form.stock) : undefined,
        stockMin: form.stockMin ? Number(form.stockMin) : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.35)", zIndex: 60, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, background: "var(--bg-panel)", borderTopLeftRadius: 16, borderBottomLeftRadius: 16, padding: "22px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "var(--r-sm)", background: "var(--bg-subtle)", border: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IcoProd size={18} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{editing ? t("editProduct") : t("newProduct")}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{t("productCatalog")}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4, borderRadius: 6, display: "flex" }}><IcoX /></button>
        </div>

        <Divider label={t("sectionType")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="form-field">
            <label>{t("typeLabel")}</label>
            <select value={form.type} onChange={e => { const tp = e.target.value as ProductType; set("type", tp); if (tp === "servicio") set("subtype", "servicio"); }}>
              <option value="fisico">{t("typePhysical")}</option>
              <option value="servicio">{t("typeService")}</option>
              <option value="paquete">{t("typePackage")}</option>
            </select>
          </div>
          <div className="form-field">
            <label>{t("modalityLabel")}</label>
            <select value={form.subtype} onChange={e => set("subtype", e.target.value)} disabled={form.type === "servicio"}>
              {form.type !== "servicio" && <option value="alquiler">{t("modalityRental")}</option>}
              {form.type !== "servicio" && <option value="venta">{t("modalitySale")}</option>}
              <option value="servicio">{t("modalityService")}</option>
            </select>
          </div>
        </div>

        <Divider label={t("sectionInfo")} />
        <div className="form-field"><label>{t("nameLabel")}</label><input value={form.name} onChange={e => set("name", e.target.value)} placeholder={t("namePlaceholder")} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="form-field"><label>{t("skuLabel")}</label><input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="MOB-SIL-01" /></div>
          <div className="form-field">
            <label>{t("categoryLabel")}</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}>
              {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="form-field"><label>{t("descriptionLabel")}</label><textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder={t("descriptionPlaceholder")} style={{ resize: "vertical", minHeight: 60 }} /></div>

        <Divider label={t("sectionPrices")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="form-field"><label>{t("costLabel")}</label><input type="number" min="0" step="0.01" value={form.cost} onChange={e => set("cost", e.target.value)} placeholder="0.00" /></div>
          <div className="form-field"><label>{t("salePriceLabel")}</label><input type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => set("unitPrice", e.target.value)} placeholder="0.00" /></div>
        </div>
        <div className="form-field">
          <label>{t("vatLabel")}</label>
          <select value={form.taxRate} onChange={e => set("taxRate", e.target.value)}>
            {VAT_RATES.map(v => <option key={v} value={v}>{v}%</option>)}
          </select>
        </div>

        {form.type !== "servicio" && (
          <>
            <Divider label={t("sectionInventory")} />
            <div className="form-field">
              <label>{t("warehouseLabel")}</label>
              <select value={form.warehouseId} onChange={e => set("warehouseId", e.target.value)}>
                <option value="">{t("noWarehouse")}</option>
                {whs.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="form-field"><label>{t("currentStockLabel")}</label><input type="number" min="0" value={form.stock} onChange={e => set("stock", e.target.value)} placeholder="0" /></div>
              <div className="form-field"><label>{t("minStockLabel")}</label><input type="number" min="0" value={form.stockMin} onChange={e => set("stockMin", e.target.value)} placeholder="0" /></div>
            </div>
            <div style={{ background: "#EEF3FF", border: "1px solid #C5D4F0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#3A5B8A", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ flexShrink: 0, lineHeight: 1.4 }}>ℹ️</span>
              <span>{t("stockHint")}</span>
            </div>
          </>
        )}

        <Divider label={t("sectionAvatarColor")} />
        <ColorPicker value={form.color} onChange={c => set("color", c)} colors={PRODUCT_COLORS} />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Avatar color={form.color} initials={form.name.split(" ").filter(Boolean).map((w: string) => w[0].toUpperCase()).slice(0, 2).join("") || "?"} size={40} />
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{t("preview")}</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end", paddingTop: 12, borderTop: "1px solid var(--line-1)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "var(--bg-panel)", color: "var(--ink-2)", fontSize: 13, cursor: "pointer" }}>{t("cancel")}</button>
          <button onClick={handleSave} disabled={!form.name.trim() || saving} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "none", background: "var(--ink-1)", color: "white", fontSize: 13, fontWeight: 500, cursor: form.name.trim() ? "pointer" : "not-allowed", opacity: !form.name.trim() ? 0.5 : 1 }}>
            {saving ? t("saving") : editing ? t("saveChanges") : t("createProduct")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// WAREHOUSE DRAWER
// ════════════════════════════════════════════════════════════════════════════════
function WarehouseDrawer({ initial, onSave, onClose }: {
  initial?: Warehouse | null;
  onSave: (data: Partial<Warehouse>) => Promise<void>;
  onClose: () => void;
}) {
  const t = useTranslations("logistics");
  const editing = !!initial;
  const [form, setForm] = useState({
    name: initial?.name || "",
    type: (initial?.type || "fijo") as "fijo" | "movil",
    location: initial?.location || "",
    capacity: initial?.capacity?.toString() || "",
    manager: initial?.manager || "",
    plate: initial?.plate || "",
    driver: initial?.driver || "",
    color: initial?.color || "#4F7A5E",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({ ...form, capacity: form.capacity ? Number(form.capacity) : undefined });
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
              {form.type === "movil" ? <IcoTruck size={18} /> : <IcoWh size={18} />}
            </div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{editing ? t("editWarehouse") : t("newWarehouse")}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4, borderRadius: 6, display: "flex" }}><IcoX /></button>
        </div>

        <Divider label={t("sectionType")} />
        <div style={{ display: "flex", gap: 8 }}>
          {(["fijo", "movil"] as const).map(wt => (
            <button key={wt} onClick={() => set("type", wt)} style={{ flex: 1, padding: "9px 0", borderRadius: "var(--r-sm)", border: `1.5px solid ${form.type === wt ? "var(--ink-1)" : "var(--line-1)"}`, background: form.type === wt ? "var(--bg-subtle)" : "var(--bg-panel)", color: form.type === wt ? "var(--ink-1)" : "var(--ink-3)", fontSize: 13, fontWeight: form.type === wt ? 600 : 400, cursor: "pointer" }}>
              {wt === "fijo" ? t("fixedWarehouse") : t("vanWarehouse")}
            </button>
          ))}
        </div>

        <Divider label={t("sectionInfo")} />
        <div className="form-field"><label>{t("nameLabel")}</label><input value={form.name} onChange={e => set("name", e.target.value)} placeholder={form.type === "fijo" ? "Almacén Principal" : "Furgoneta 1"} /></div>
        {form.type === "fijo" ? (
          <>
            <div className="form-field"><label>{t("addressLabel")}</label><input value={form.location} onChange={e => set("location", e.target.value)} placeholder={t("addressPlaceholder")} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="form-field"><label>{t("capacitySqm")}</label><input type="number" min="0" value={form.capacity} onChange={e => set("capacity", e.target.value)} placeholder="0" /></div>
              <div className="form-field"><label>{t("managerLabel")}</label><input value={form.manager} onChange={e => set("manager", e.target.value)} placeholder={t("managerPlaceholder")} /></div>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="form-field"><label>{t("plateLabel")}</label><input value={form.plate} onChange={e => set("plate", e.target.value)} placeholder={t("platePlaceholder")} /></div>
              <div className="form-field"><label>{t("driverLabel")}</label><input value={form.driver} onChange={e => set("driver", e.target.value)} placeholder={t("driverPlaceholder")} /></div>
            </div>
            <div className="form-field"><label>{t("capacityUnits")}</label><input type="number" min="0" value={form.capacity} onChange={e => set("capacity", e.target.value)} placeholder="0" /></div>
          </>
        )}

        <Divider label={t("sectionColor")} />
        <ColorPicker value={form.color} onChange={c => set("color", c)} colors={WH_COLORS} />

        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end", paddingTop: 12, borderTop: "1px solid var(--line-1)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "var(--bg-panel)", color: "var(--ink-2)", fontSize: 13, cursor: "pointer" }}>{t("cancel")}</button>
          <button onClick={handleSave} disabled={!form.name.trim() || saving} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "none", background: "var(--ink-1)", color: "white", fontSize: 13, fontWeight: 500, cursor: form.name.trim() ? "pointer" : "not-allowed", opacity: !form.name.trim() ? 0.5 : 1 }}>
            {saving ? t("saving") : editing ? t("saveChanges") : t("createWarehouse")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// LOAD EVENT DRAWER — Asignar evento a furgoneta y cargar materiales
// ════════════════════════════════════════════════════════════════════════════════
interface EventOption { id: number; name: string; date: string | null; location: string | null; status: string | null; }

function LoadEventDrawer({ warehouse, products, onSave, onClose }: {
  warehouse: Warehouse;
  products: Product[];
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const t = useTranslations("logistics");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventQ, setEventQ] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<EventOption | null>(null);
  const [items, setItems] = useState<{ productId: string; quantity: string }[]>([{ productId: "", quantity: "1" }]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/events?limit=100")
      .then(r => r.json())
      .then(d => {
        const list: EventOption[] = (d.data || []).map((e: Record<string, unknown>) => ({
          id: e.id as number,
          name: e.name as string,
          date: (e.date as string | null) ?? null,
          location: (e.location as string | null) ?? null,
          status: (e.status as string | null) ?? null,
        }));
        setEvents(list);
      })
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  }, []);

  const filteredEvents = useMemo(() => {
    if (!eventQ.trim()) return events.slice(0, 20);
    const t = eventQ.toLowerCase();
    return events.filter(e => e.name.toLowerCase().includes(t)).slice(0, 20);
  }, [events, eventQ]);

  const physical = products.filter(p => p.type === "fisico" || p.type === "paquete");
  const addItem = () => setItems(i => [...i, { productId: "", quantity: "1" }]);
  const removeItem = (idx: number) => setItems(i => i.filter((_, j) => j !== idx));
  const setItem = (idx: number, k: "productId" | "quantity", v: string) =>
    setItems(i => i.map((item, j) => j === idx ? { ...item, [k]: v } : item));

  const handleSave = async () => {
    if (!selectedEvent) return;
    setSaving(true);
    try {
      const validItems = items
        .filter(i => i.productId && Number(i.quantity) > 0)
        .map(i => ({ productId: Number(i.productId), quantity: Number(i.quantity) }));
      await onSave({
        eventName: selectedEvent.name,
        date: selectedEvent.date ? selectedEvent.date.slice(0, 10) : undefined,
        venue: selectedEvent.location || undefined,
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        status: "confirmada",
        items: validItems,
        notes,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const fmtEventDate = (d: string | null) => {
    if (!d) return null;
    try { return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return null; }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.35)", zIndex: 60, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 520, background: "var(--bg-panel)", borderTopLeftRadius: 16, borderBottomLeftRadius: 16, display: "flex", flexDirection: "column", height: "100%" }}>

        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: "var(--r-sm)", background: "#FBF4E3", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IcoTruck size={18} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{t("loadVan")}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>{warehouse.name}{warehouse.plate ? ` · ${warehouse.plate}` : ""}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 6, display: "flex" }}><IcoX size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Event picker */}
          <div>
            <Divider label={t("selectEventSection")} />
            <div style={{ position: "relative", marginTop: 10 }}>
              <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", pointerEvents: "none", display: "flex" }}><IcoSearch size={13} /></span>
              <input
                value={eventQ}
                onChange={e => setEventQ(e.target.value)}
                placeholder={t("searchEventPlaceholder")}
                style={{ width: "100%", paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", background: "var(--bg-subtle)", fontSize: 12.5, color: "var(--ink-1)", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {loadingEvents ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-3)", fontSize: 12.5 }}>{t("loadingEvents")}</div>
            ) : filteredEvents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-3)", fontSize: 12.5 }}>{t("noEvents")}{eventQ ? t("noEventsMatch") : ""}</div>
            ) : (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
                {filteredEvents.map(ev => {
                  const selected = selectedEvent?.id === ev.id;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                        borderRadius: "var(--r-sm)", border: `1px solid ${selected ? "var(--primary)" : "var(--line-1)"}`,
                        background: selected ? "var(--primary)10" : "var(--bg-subtle)",
                        cursor: "pointer", textAlign: "left", transition: "all .15s",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: selected ? 600 : 500, color: selected ? "var(--primary)" : "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ev.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, display: "flex", gap: 8 }}>
                          {ev.date && <span>📅 {fmtEventDate(ev.date)}</span>}
                          {ev.location && <span>📍 {ev.location}</span>}
                        </div>
                      </div>
                      {selected && <IcoDone size={15} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Products to load */}
          {selectedEvent && (
            <>
              <Divider label={t("materialsSection")} />
              {items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ flex: 1 }} className="form-field">
                    {idx === 0 && <label>{t("productLabel")}</label>}
                    <select value={item.productId} onChange={e => setItem(idx, "productId", e.target.value)}>
                      <option value="">{t("selectOption")}</option>
                      {physical.map(p => <option key={p.id} value={p.id}>{p.name}{p.stock != null ? ` (${p.stock} uds.)` : ""}</option>)}
                    </select>
                  </div>
                  <div style={{ width: 70 }} className="form-field">
                    {idx === 0 && <label>{t("quantityShort")}</label>}
                    <input type="number" min="1" value={item.quantity} onChange={e => setItem(idx, "quantity", e.target.value)} />
                  </div>
                  <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: "4px", marginTop: idx === 0 ? 18 : 0, flexShrink: 0, display: "flex" }}>
                    <IcoX size={14} />
                  </button>
                </div>
              ))}
              <button onClick={addItem} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px dashed var(--line-1)", borderRadius: "var(--r-sm)", background: "transparent", color: "var(--ink-3)", fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>
                <IcoPlus size={12} /> {t("addProduct")}
              </button>

              <Divider label={t("internalNotesSection")} />
              <div className="form-field">
                <label>{t("internalNotesLabel")}</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("internalNotesPlaceholder")} style={{ resize: "vertical", minHeight: 60 }} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--line-1)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "var(--bg-panel)", color: "var(--ink-2)", fontSize: 13, cursor: "pointer" }}>{t("cancel")}</button>
          <button
            onClick={handleSave}
            disabled={!selectedEvent || saving}
            style={{ padding: "8px 18px", borderRadius: "var(--r-sm)", border: "none", background: "var(--ink-1)", color: "white", fontSize: 13, fontWeight: 500, cursor: selectedEvent ? "pointer" : "not-allowed", opacity: !selectedEvent ? 0.5 : 1 }}
          >
            {saving ? t("saving") : t("confirmLoad")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// WAREHOUSE DETAIL DRAWER
// ════════════════════════════════════════════════════════════════════════════════
function WarehouseDetailDrawer({ warehouse, products, onEdit, onClose }: {
  warehouse: Warehouse;
  products: Product[];
  onEdit: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("logistics");
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMov, setLoadingMov] = useState(true);

  useEffect(() => {
    fetch("/api/stock-movements?limit=20")
      .then(r => r.json())
      .then(d => { if (d.data) setMovements(d.data.filter((m: StockMovement) => m.warehouseId === warehouse.id).slice(0, 10)); })
      .catch(() => {})
      .finally(() => setLoadingMov(false));
  }, [warehouse.id]);

  const whProducts = products.filter(p => p.warehouseId === warehouse.id);
  const totalStock = whProducts.reduce((s, p) => s + (p.stock ?? 0), 0);
  const capacity = warehouse.capacity || 0;
  const occupancyPct = capacity > 0 ? Math.min(100, Math.round((totalStock / capacity) * 100)) : 0;
  const wColor = warehouse.color || "#4F7A5E";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.35)", zIndex: 60, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, background: "var(--bg-panel)", borderTopLeftRadius: 16, borderBottomLeftRadius: 16, display: "flex", flexDirection: "column", height: "100%" }}>

        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: "var(--r-sm)", background: wColor + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: wColor }}>
            {warehouse.initials || warehouse.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)" }}>{warehouse.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>
              {warehouse.type === "fijo"
                ? warehouse.location || t("locationUnknown")
                : `${warehouse.plate || t("noPlate")}${warehouse.driver ? ` · ${warehouse.driver}` : ""}`}
            </div>
          </div>
          <button onClick={onEdit} style={{ padding: "6px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "var(--bg-subtle)", color: "var(--ink-2)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <IcoEdit size={12} /> {t("editWarehouseBtn")}
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 6, display: "flex" }}><IcoX size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Info row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={{ background: "var(--bg-subtle)", borderRadius: "var(--r-sm)", padding: "12px 14px", border: "1px solid var(--line-1)" }}>
              <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 500, marginBottom: 4 }}>{t("typeInfo")}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-1)" }}>{warehouse.type === "movil" ? t("mobileType") : t("fixedType")}</div>
            </div>
            <div style={{ background: "var(--bg-subtle)", borderRadius: "var(--r-sm)", padding: "12px 14px", border: "1px solid var(--line-1)" }}>
              <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 500, marginBottom: 4 }}>{t("productsLabel")}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-1)" }}>{whProducts.length}</div>
            </div>
            <div style={{ background: "var(--bg-subtle)", borderRadius: "var(--r-sm)", padding: "12px 14px", border: "1px solid var(--line-1)" }}>
              <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 500, marginBottom: 4 }}>{t("capacityLabel")}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: occupancyPct > 85 ? "#B55450" : "var(--ink-1)" }}>
                {capacity > 0 ? `${occupancyPct}%` : "∞"}
              </div>
            </div>
          </div>

          {/* Evento asignado (furgonetas) */}
          {warehouse.type === "movil" && (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("currentEventLabel")}</div>
              <div style={{ padding: "12px 14px", borderRadius: "var(--r-sm)", background: warehouse.eventName ? "#F0EBF8" : "var(--bg-subtle)", border: `1px solid ${warehouse.eventName ? "#C9B8E8" : "var(--line-1)"}` }}>
                {warehouse.eventName ? (
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#7B5EA7" }}>🟣 {warehouse.eventName}</div>
                ) : (
                  <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{t("noEventAssigned")}</div>
                )}
              </div>
            </div>
          )}

          {/* Ocupación bar */}
          {capacity > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>
                <span>{t("occupancyLabel")}</span>
                <span style={{ fontWeight: 500 }}>{totalStock} / {capacity} uds.</span>
              </div>
              <div style={{ height: 8, background: "var(--bg-subtle)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${occupancyPct}%`, background: occupancyPct > 85 ? "#B55450" : occupancyPct > 60 ? "#B88325" : wColor, borderRadius: 999, transition: "width .4s" }} />
              </div>
            </div>
          )}

          {/* Products list */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {warehouse.type === "movil" ? t("loadedMaterials") : t("inventory")}
            </div>
            {whProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-3)", fontSize: 12.5 }}>{t("noProductsAssigned")}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", overflow: "hidden" }}>
                {whProducts.map((p, idx) => {
                  const low = p.stock != null && p.stockMin != null && p.stock <= p.stockMin;
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: idx < whProducts.length - 1 ? "1px solid var(--line-1)" : "none" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: (p.color || "#888") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color: p.color || "#888", flexShrink: 0 }}>
                        {p.initials || p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                        {p.sku && <div style={{ fontSize: 10.5, color: "var(--ink-4)", fontFamily: "monospace" }}>{p.sku}</div>}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: low ? "#B55450" : "var(--ink-1)" }}>{p.stock ?? "—"}</div>
                        {p.stockMin != null && <div style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{t("minShort")} {p.stockMin}</div>}
                      </div>
                      {low && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "#FBEDEC", color: "#B55450", flexShrink: 0 }}>!</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent movements */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("recentMovements")}</div>
            {loadingMov ? (
              <div style={{ fontSize: 12.5, color: "var(--ink-3)", padding: "12px 0" }}>{t("loading")}</div>
            ) : movements.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--ink-3)", fontSize: 12.5 }}>{t("noMovementsRegistered")}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", overflow: "hidden" }}>
                {movements.map((m, idx) => {
                  const mStyle = MOVE_TYPE_STYLE[m.type] || MOVE_TYPE_STYLE.ajuste;
                  return (
                    <div key={m.id} style={{ display: "flex", gap: 10, padding: "10px 14px", borderBottom: idx < movements.length - 1 ? "1px solid var(--line-1)" : "none", alignItems: "center" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 999, background: mStyle.bg, display: "flex", alignItems: "center", justifyContent: "center", color: mStyle.color, fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                        {mStyle.sign}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.productName || "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{mStyle.label} ×{m.quantity}</div>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)", flexShrink: 0 }}>{m.date ? fmtDate(m.date) : "—"}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MOVEMENT DRAWER
// ════════════════════════════════════════════════════════════════════════════════
function MovementDrawer({ products, warehouses: whs, onSave, onClose }: {
  products: Product[];
  warehouses: Warehouse[];
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const t = useTranslations("logistics");
  const [type, setType] = useState("entrada");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [fromId, setFromId] = useState(whs[0]?.id.toString() || "");
  const [toId, setToId] = useState(whs[1]?.id.toString() || whs[0]?.id.toString() || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeFrom, setTimeFrom] = useState("09:00");
  const [timeTo, setTimeTo] = useState("23:00");
  const [eventName, setEventName] = useState("");
  const [notes, setNotes] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const physical = products.filter(p => p.type === "fisico" || p.type === "paquete");

  const handleSave = async () => {
    if (!productId) return;
    setSaving(true);
    try {
      await onSave({
        type, productId: Number(productId), quantity: Number(qty), date,
        warehouseId: type !== "transferencia" ? (fromId ? Number(fromId) : undefined) : undefined,
        fromWarehouseId: type === "transferencia" ? (fromId ? Number(fromId) : undefined) : undefined,
        toWarehouseId: type === "transferencia" ? (toId ? Number(toId) : undefined) : undefined,
        timeFrom: type === "reserva" ? timeFrom : undefined,
        timeTo: type === "reserva" ? timeTo : undefined,
        eventName: eventName || undefined,
        notes: notes || undefined,
        reference: reference || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,25,20,0.28)", display: "flex", justifyContent: "flex-end", zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, background: "var(--bg-panel)", boxShadow: "-12px 0 32px rgba(0,0,0,.14)", display: "flex", flexDirection: "column", height: "100%", borderLeft: "1px solid var(--line-1)" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{t("newMovement")}</div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 6, display: "flex" }}><IcoX size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-3)", marginBottom: 8 }}>{t("movementTypeLabel")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(MOVE_TYPE_STYLE).map(([k, v]) => (
                <button key={k} onClick={() => setType(k)} style={{ padding: "6px 12px", borderRadius: "var(--r-sm)", border: `1.5px solid ${type === k ? v.color : "var(--line-1)"}`, background: type === k ? v.bg : "var(--bg-panel)", color: type === k ? v.color : "var(--ink-2)", fontSize: 12.5, fontWeight: type === k ? 600 : 400, cursor: "pointer" }}>
                  {v.sign} {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label>{t("productLabel")} *</label>
            <select value={productId} onChange={e => setProductId(e.target.value)}>
              <option value="">{t("selectProduct")}</option>
              {physical.map(p => <option key={p.id} value={p.id}>{p.name}{p.stock != null ? ` — stock: ${p.stock}` : ""}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-field"><label>{t("quantityLabel")}</label><input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} /></div>
            <div className="form-field"><label>{t("dateLabel")}</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          </div>

          {type === "transferencia" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-field"><label>{t("originLabel")}</label><select value={fromId} onChange={e => setFromId(e.target.value)}>{whs.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
              <div className="form-field"><label>{t("destinationLabel")}</label><select value={toId} onChange={e => setToId(e.target.value)}>{whs.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            </div>
          ) : (
            <div className="form-field">
              <label>{t("warehouseMovLabel")}</label>
              <select value={fromId} onChange={e => setFromId(e.target.value)}>
                {whs.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          )}

          {type === "reserva" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-field"><label>{t("startTimeLabel")}</label><input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} /></div>
                <div className="form-field"><label>{t("endTimeLabel")}</label><input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} /></div>
              </div>
              <div className="form-field"><label>{t("eventLabel")}</label><input value={eventName} onChange={e => setEventName(e.target.value)} placeholder={t("eventPlaceholder")} /></div>
            </>
          )}

          <div className="form-field"><label>{t("referenceLabel")}</label><input value={reference} onChange={e => setReference(e.target.value)} placeholder={t("referencePlaceholder")} /></div>
          <div className="form-field"><label>{t("notesLabel")}</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("observationsPlaceholder")} style={{ resize: "vertical", minHeight: 60 }} /></div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--line-1)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "var(--bg-panel)", color: "var(--ink-2)", fontSize: 13, cursor: "pointer" }}>{t("cancel")}</button>
          <button onClick={handleSave} disabled={!productId || saving} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "none", background: "var(--ink-1)", color: "white", fontSize: 13, fontWeight: 500, cursor: productId ? "pointer" : "not-allowed", opacity: !productId ? 0.5 : 1 }}>
            {saving ? t("saving") : t("registerMovement")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// RESERVATION DRAWER
// ════════════════════════════════════════════════════════════════════════════════
interface ReservationFormItem { productId: string; quantity: string; }

function ReservationDrawer({ initial, warehouses: whs, products, onSave, onClose }: {
  initial?: Reservation | null;
  warehouses: Warehouse[];
  products: Product[];
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const t = useTranslations("logistics");
  const editing = !!initial;
  const [form, setForm] = useState({
    eventName: initial?.eventName || "",
    date: initial?.date || new Date().toISOString().slice(0, 10),
    timeFrom: initial?.timeFrom || "09:00",
    timeTo: initial?.timeTo || "23:00",
    warehouseId: initial?.warehouseId?.toString() || "",
    venue: initial?.venue || "",
    venueCity: initial?.venueCity || "",
    status: (initial?.status || "pendiente") as LogisticsStatus,
    notes: initial?.notes || "",
    itemsLocation: initial?.itemsLocation || "",
  });
  const [items, setItems] = useState<ReservationFormItem[]>(
    initial?.items?.map(i => ({ productId: i.productId.toString(), quantity: i.quantity.toString() })) || [{ productId: "", quantity: "1" }]
  );
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const physical = products.filter(p => p.type === "fisico" || p.type === "paquete");

  const addItem = () => setItems(i => [...i, { productId: "", quantity: "1" }]);
  const removeItem = (idx: number) => setItems(i => i.filter((_, j) => j !== idx));
  const setItem = (idx: number, k: "productId" | "quantity", v: string) =>
    setItems(i => i.map((item, j) => j === idx ? { ...item, [k]: v } : item));

  const handleSave = async () => {
    if (!form.eventName.trim()) return;
    setSaving(true);
    try {
      const validItems = items.filter(i => i.productId && Number(i.quantity) > 0).map(i => ({
        productId: Number(i.productId),
        quantity: Number(i.quantity),
      }));
      await onSave({
        ...form,
        warehouseId: form.warehouseId ? Number(form.warehouseId) : undefined,
        items: validItems,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.35)", zIndex: 60, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 520, background: "var(--bg-panel)", borderTopLeftRadius: 16, borderBottomLeftRadius: 16, display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{editing ? t("editReservation") : t("newReservation")}</div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 6, display: "flex" }}><IcoX size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Divider label={t("eventSection")} />
          <div className="form-field"><label>{t("eventNameLabel")}</label><input value={form.eventName} onChange={e => set("eventName", e.target.value)} placeholder={t("eventNamePlaceholder")} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="form-field"><label>{t("dateLabel")}</label><input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            <div className="form-field">
              <label>{t("statusLabel")}</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="pendiente">{t("statusPending")}</option>
                <option value="confirmada">{t("statusConfirmed")}</option>
                <option value="en_ruta">{t("statusEnRoute")}</option>
                <option value="entregada">{t("statusDelivered")}</option>
                <option value="devuelta">{t("statusReturned")}</option>
                <option value="cancelada">{t("statusCancelled")}</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="form-field"><label>{t("startTimeLabel")}</label><input type="time" value={form.timeFrom} onChange={e => set("timeFrom", e.target.value)} /></div>
            <div className="form-field"><label>{t("endTimeLabel")}</label><input type="time" value={form.timeTo} onChange={e => set("timeTo", e.target.value)} /></div>
          </div>

          <Divider label={t("locationSection")} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="form-field"><label>{t("venueLabel")}</label><input value={form.venue} onChange={e => set("venue", e.target.value)} placeholder={t("venuePlaceholder")} /></div>
            <div className="form-field"><label>{t("cityLabel")}</label><input value={form.venueCity} onChange={e => set("venueCity", e.target.value)} placeholder={t("cityPlaceholder")} /></div>
          </div>

          <Divider label={t("transportSection")} />
          <div className="form-field">
            <label>{t("vehicleWarehouseLabel")}</label>
            <select value={form.warehouseId} onChange={e => set("warehouseId", e.target.value)}>
              <option value="">{t("noAssigned")}</option>
              {whs.map(w => <option key={w.id} value={w.id}>{w.name} ({w.type === "movil" ? t("vanOption") : t("fixedOption")})</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>{t("itemsLocationLabel")}</label>
            <input value={form.itemsLocation} onChange={e => set("itemsLocation", e.target.value)} placeholder={t("itemsLocationPlaceholder")} />
          </div>

          <Divider label={t("materialsSection2")} />
          {items.map((item, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1 }} className="form-field">
                {idx === 0 && <label>{t("productLabel")}</label>}
                <select value={item.productId} onChange={e => setItem(idx, "productId", e.target.value)}>
                  <option value="">{t("selectOption")}</option>
                  {physical.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ width: 70 }} className="form-field">
                {idx === 0 && <label>{t("quantityShort")}</label>}
                <input type="number" min="1" value={item.quantity} onChange={e => setItem(idx, "quantity", e.target.value)} />
              </div>
              <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: "4px", marginTop: idx === 0 ? 18 : 0, flexShrink: 0, display: "flex" }}>
                <IcoX size={14} />
              </button>
            </div>
          ))}
          <button onClick={addItem} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "1px dashed var(--line-1)", borderRadius: "var(--r-sm)", background: "transparent", color: "var(--ink-3)", fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>
            <IcoPlus size={12} /> {t("addProduct")}
          </button>

          <Divider label={t("internalNotesSection")} />
          <div className="form-field"><label>{t("internalNotesLabel")}</label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder={t("observationsPlaceholder")} style={{ resize: "vertical", minHeight: 60 }} /></div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--line-1)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "var(--bg-panel)", color: "var(--ink-2)", fontSize: 13, cursor: "pointer" }}>{t("cancel")}</button>
          <button onClick={handleSave} disabled={!form.eventName.trim() || saving} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "none", background: "var(--ink-1)", color: "white", fontSize: 13, fontWeight: 500, cursor: form.eventName.trim() ? "pointer" : "not-allowed", opacity: !form.eventName.trim() ? 0.5 : 1 }}>
            {saving ? t("saving") : editing ? t("saveChanges") : t("createReservation")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 1 — ALMACENES
// ════════════════════════════════════════════════════════════════════════════════
function WarehousesTab({ warehouses: whs, products, onRefetch, onNewMovement, openNew, onNewConsumed }: {
  warehouses: Warehouse[];
  products: Product[];
  onRefetch: () => void;
  onNewMovement: () => void;
  openNew?: boolean;
  onNewConsumed?: () => void;
}) {
  const t = useTranslations("logistics");
  const [editItem, setEditItem] = useState<Warehouse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailWarehouse, setDetailWarehouse] = useState<Warehouse | null>(null);
  const [loadWarehouse, setLoadWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    if (openNew) {
      setEditItem(null);
      setDrawerOpen(true);
      onNewConsumed?.();
    }
  }, [openNew]); // eslint-disable-line react-hooks/exhaustive-deps

  // Products grouped by warehouseId
  const productsByWarehouse = useMemo(() => {
    const map = new Map<number, Product[]>();
    for (const p of products) {
      if (p.warehouseId != null) {
        const list = map.get(p.warehouseId) ?? [];
        list.push(p);
        map.set(p.warehouseId, list);
      }
    }
    return map;
  }, [products]);

  const handleSave = async (data: Partial<Warehouse>) => {
    if (editItem) {
      await fetch(`/api/warehouses/${editItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      toast.success(t("warehouseUpdated"));
    } else {
      await fetch("/api/warehouses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      toast.success(t("warehouseCreated"));
    }
    setEditItem(null);
    onRefetch();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/warehouses/${id}`, { method: "DELETE" });
    toast.success(t("warehouseDeleted"));
    onRefetch();
  };

  const unassignEvent = async (w: Warehouse) => {
    await fetch(`/api/warehouses/${w.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: null, eventName: null }) });
    toast.success(t("eventUnassigned"));
    onRefetch();
  };

  if (whs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-3)" }}>
        <IcoWh size={32} />
        <div style={{ marginTop: 12, fontSize: 14, fontWeight: 500 }}>{t("noWarehouses")}</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>{t("noWarehousesHint")}</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {whs.map(w => {
          const whProducts = productsByWarehouse.get(w.id) ?? [];
          const totalStock = whProducts.reduce((s, p) => s + (p.stock ?? 0), 0);
          const capacity = w.capacity || 0;
          const occupancyPct = capacity > 0 ? Math.min(100, Math.round((totalStock / capacity) * 100)) : 0;
          const isMobil = w.type === "movil";
          const wColor = w.color || "#4F7A5E";
          const initials = w.initials || w.name.slice(0, 2).toUpperCase();

          return (
            <div key={w.id} style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "var(--r-sm)", background: wColor + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: wColor, flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink-1)" }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                    {w.type === "fijo" ? (w.location || "—") : `${w.plate || ""}${w.driver ? ` · ${w.driver}` : ""}`}
                  </div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: isMobil ? "#FBF4E3" : "#E8EEF6", color: isMobil ? "#B88325" : "#4A6A94", flexShrink: 0 }}>
                  {isMobil ? t("mobileLabel") : t("fixedLabel")}
                </span>
              </div>

              {/* Evento badge (solo furgonetas) */}
              {isMobil && (
                <div style={{ padding: "8px 12px", borderRadius: "var(--r-sm)", background: w.eventName ? "#F0EBF8" : "var(--bg-subtle)", border: `1px solid ${w.eventName ? "#C9B8E8" : "var(--line-1)"}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: w.eventName ? "#7B5EA7" : "var(--ink-4)", flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12.5, color: w.eventName ? "#7B5EA7" : "var(--ink-3)", fontWeight: w.eventName ? 500 : 400 }}>
                    {w.eventName || t("noEventAssigned")}
                  </div>
                  {w.eventName && (
                    <button onClick={() => unassignEvent(w)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 14, padding: "0 2px", lineHeight: 1 }}>×</button>
                  )}
                </div>
              )}

              {/* Capacidad */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>
                  <span>{t("occupancyLabel")} ({whProducts.length} {whProducts.length === 1 ? t("occupancyProducts") : t("occupancyProductsPlural")})</span>
                  <span style={{ fontWeight: 500 }}>{totalStock} / {capacity || "∞"} uds.</span>
                </div>
                <div style={{ height: 6, background: "var(--bg-subtle)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: capacity > 0 ? `${occupancyPct}%` : "0%", background: occupancyPct > 85 ? "#B55450" : occupancyPct > 60 ? "#B88325" : wColor, borderRadius: 999, transition: "width .4s" }} />
                </div>
              </div>

              {/* Lista de productos / materiales */}
              {whProducts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {isMobil && <div style={{ fontSize: 11.5, fontWeight: 600, color: "#B88325", display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>🚐 Materiales cargados</div>}
                  {whProducts.slice(0, 3).map(p => {
                    const low = p.stock != null && p.stockMin != null && p.stock <= p.stockMin;
                    return (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 4, background: (p.color || "#888") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: p.color || "#888", flexShrink: 0 }}>
                          {p.initials || p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ flex: 1, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                        <span style={{ color: low ? "#B55450" : "var(--ink-3)", fontWeight: low ? 600 : 400 }}>{p.stock ?? "—"}</span>
                      </div>
                    );
                  })}
                  {whProducts.length > 3 && (
                    <div style={{ fontSize: 11.5, color: "var(--ink-4)", paddingLeft: 28 }}>+{whProducts.length - 3} más</div>
                  )}
                </div>
              )}

              {/* Acciones */}
              <div style={{ display: "flex", gap: 6, paddingTop: 4, borderTop: "1px solid var(--line-1)" }}>
                <button onClick={() => setDetailWarehouse(w)} style={{ flex: 1, padding: "7px", background: "var(--bg-subtle)", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", fontSize: 12, cursor: "pointer", color: "var(--ink-2)" }}>
                  {t("viewDetail")}
                </button>
                {isMobil && (
                  <button onClick={() => setLoadWarehouse(w)} style={{ flex: 1, padding: "7px", background: wColor + "15", border: `1px solid ${wColor}44`, borderRadius: "var(--r-sm)", fontSize: 12, cursor: "pointer", color: wColor, fontWeight: 500 }}>
                    {w.eventName ? t("editLoad") : t("loadVanBtn")}
                  </button>
                )}
                <button onClick={onNewMovement} title={t("newMovementBtn")} style={{ padding: "7px 10px", background: "var(--bg-subtle)", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", fontSize: 12, cursor: "pointer", color: "var(--ink-2)" }}>
                  {t("newMovShort")}
                </button>
                <button onClick={() => handleDelete(w.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "7px 8px", borderRadius: "var(--r-sm)", border: "none", background: "#FBEDEC", color: "#B55450", cursor: "pointer" }}>
                  <IcoTrash size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {drawerOpen && (
        <WarehouseDrawer
          initial={editItem}
          onSave={handleSave}
          onClose={() => { setDrawerOpen(false); setEditItem(null); }}
        />
      )}

      {detailWarehouse && (
        <WarehouseDetailDrawer
          warehouse={detailWarehouse}
          products={products}
          onEdit={() => { setEditItem(detailWarehouse); setDetailWarehouse(null); setDrawerOpen(true); }}
          onClose={() => setDetailWarehouse(null)}
        />
      )}

      {loadWarehouse && (
        <LoadEventDrawer
          warehouse={loadWarehouse}
          products={products}
          onSave={async (data) => {
            await fetch("/api/logistics-reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            toast.success(t("vanLoadedSuccess"));
            setLoadWarehouse(null);
            onRefetch();
          }}
          onClose={() => setLoadWarehouse(null)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 2 — STOCK GLOBAL
// ════════════════════════════════════════════════════════════════════════════════
function StockGlobalTab({ products, warehouses: whs }: { products: Product[]; warehouses: Warehouse[] }) {
  const t = useTranslations("logistics");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("todos");

  const warehouseMap = useMemo(() => {
    const m = new Map<number, string>();
    whs.forEach(w => m.set(w.id, w.name));
    return m;
  }, [whs]);

  const filtered = useMemo(() => {
    let list = products.filter(p => p.type !== "servicio");
    if (filter === "alerta") list = list.filter(p => p.stock != null && p.stockMin != null && p.stock <= p.stockMin);
    else if (filter === "disponible") list = list.filter(p => (p.stock ?? 0) > (p.stockMin ?? 0));
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(t) || (p.sku || "").toLowerCase().includes(t));
    }
    return list;
  }, [products, filter, q]);

  const FILTERS = [
    { id: "todos", label: t("filterAll") },
    { id: "disponible", label: t("filterAvailable") },
    { id: "alerta", label: t("filterAlert") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Search + filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", pointerEvents: "none", display: "flex" }}><IcoSearch /></span>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t("searchProductSku")}
            style={{ paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", background: "var(--bg-panel)", fontSize: 12.5, width: 220, color: "var(--ink-1)", outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "5px 12px", borderRadius: 999, border: "1px solid var(--line-1)", background: filter === f.id ? "var(--ink-1)" : "var(--bg-panel)", color: filter === f.id ? "white" : "var(--ink-2)", fontSize: 12, cursor: "pointer", fontWeight: filter === f.id ? 600 : 400 }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>{t("colProduct")}</th>
                <th>{t("colWarehouse")}</th>
                <th style={{ textAlign: "right" }}>{t("colTotal")}</th>
                <th style={{ textAlign: "right" }}>{t("colAvailable")}</th>
                <th style={{ textAlign: "right", color: "#7B5EA7" }}>{t("colReserved")}</th>
                <th style={{ textAlign: "right", color: "#C4874A" }}>{t("colEnRoute")}</th>
                <th>{t("colLocation")}</th>
                <th>{t("colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-3)", fontSize: 13 }}>{t("noProductsMatch")}</td></tr>
              )}
              {filtered.map(p => {
                const low = p.stock != null && p.stockMin != null && p.stock <= p.stockMin;
                return (
                  <tr key={p.id}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar color={p.color} initials={p.initials} size={32} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                          {p.sku && <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "monospace" }}>{p.sku}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--ink-2)" }}>
                      {p.warehouseId ? (warehouseMap.get(p.warehouseId) || p.warehouseName || "—") : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 600 }}>{p.stock ?? "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, color: "#4F7A5E", fontWeight: 500 }}>{p.stock ?? "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, color: "#7B5EA7", fontWeight: 500 }}>—</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, color: "#C4874A", fontWeight: 500 }}>—</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--ink-3)" }}>
                      {p.warehouseId ? (warehouseMap.get(p.warehouseId) || "—") : "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {low ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#FBEDEC", color: "#B55450", whiteSpace: "nowrap" }}>
                          <IcoAlert size={11} /> {t("stockLow")}
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 500, background: "#EDF5EE", color: "#4F7A5E", whiteSpace: "nowrap" }}>
                          {t("available")}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line-1)", fontSize: 12, color: "var(--ink-3)" }}>
          {filtered.length} {filtered.length === 1 ? t("productSingular") : t("productPlural")}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 3 — MOVIMIENTOS
// ════════════════════════════════════════════════════════════════════════════════
function MovementsTab({ products, warehouses: whs, movementDrawerOpen, onMovementDrawerClose }: {
  products: Product[];
  warehouses: Warehouse[];
  movementDrawerOpen: boolean;
  onMovementDrawerClose: () => void;
}) {
  const t = useTranslations("logistics");
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stock-movements");
      const data = await res.json();
      if (data.success) setMovements(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  // Refetch when drawer closes (a movement might have been created)
  useEffect(() => {
    if (!movementDrawerOpen) fetchMovements();
  }, [movementDrawerOpen, fetchMovements]);

  const handleSave = async (data: Record<string, unknown>) => {
    await fetch("/api/stock-movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    toast.success(t("movementRegistered"));
    fetchMovements();
  };

  const filtered = useMemo(() => {
    let list = movements;
    if (typeFilter !== "todos") list = list.filter(m => m.type === typeFilter);
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter(m => (m.productName || "").toLowerCase().includes(t) || (m.notes || "").toLowerCase().includes(t) || (m.reference || "").toLowerCase().includes(t));
    }
    return list;
  }, [movements, typeFilter, q]);

  if (loading) return <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-3)" }}>{t("loadingMovements")}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", pointerEvents: "none", display: "flex" }}><IcoSearch /></span>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t("searchProductNote")}
            style={{ paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", background: "var(--bg-panel)", fontSize: 12.5, width: 220, color: "var(--ink-1)", outline: "none" }}
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: "7px 10px", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", background: "var(--bg-panel)", fontSize: 12.5, color: "var(--ink-1)", outline: "none", cursor: "pointer" }}
        >
          <option value="todos">{t("allTypes")}</option>
          {Object.entries(MOVE_TYPE_STYLE).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-3)" }}>
          <IcoMov size={32} />
          <div style={{ marginTop: 12, fontSize: 14, fontWeight: 500 }}>{t("noMovements")}</div>
        </div>
      ) : (
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: 14, overflow: "hidden" }}>
          {filtered.map((m, idx) => {
            const style = MOVE_TYPE_STYLE[m.type] || MOVE_TYPE_STYLE.ajuste;
            return (
              <div key={m.id} style={{ display: "flex", gap: 12, padding: "13px 16px", borderBottom: idx < filtered.length - 1 ? "1px solid var(--line-1)" : "none", alignItems: "flex-start" }}>
                {/* Type icon */}
                <div style={{ width: 34, height: 34, borderRadius: 999, background: style.bg, display: "flex", alignItems: "center", justifyContent: "center", color: style.color, fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                  {style.sign}
                </div>
                {/* Middle */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)" }}>{m.productName || "—"}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: style.bg, color: style.color }}>
                      {style.label}
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: style.color }}>×{m.quantity}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {m.warehouseName && <span>{m.warehouseName}</span>}
                    {m.eventName && <span style={{ color: "#4A6A94" }}>· {m.eventName}</span>}
                    {m.timeFrom && m.timeTo && <span>· {m.timeFrom}–{m.timeTo}</span>}
                    {m.notes && <span>· {m.notes}</span>}
                  </div>
                </div>
                {/* Right */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{m.date ? fmtDate(m.date) : "—"}</div>
                  {m.reference && <div style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "monospace", marginTop: 2 }}>{m.reference}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {movementDrawerOpen && (
        <MovementDrawer
          products={products}
          warehouses={whs}
          onSave={handleSave}
          onClose={onMovementDrawerClose}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 4 — RESERVAS
// ════════════════════════════════════════════════════════════════════════════════
function ReservasTab({ warehouses: whs, products }: { warehouses: Warehouse[]; products: Product[] }) {
  const t = useTranslations("logistics");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("todas");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<Reservation | null>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logistics-reservations");
      const data = await res.json();
      if (data.success) setReservations(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const handleSave = async (data: Record<string, unknown>) => {
    if (editItem) {
      await fetch(`/api/logistics-reservations/${editItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      toast.success(t("reservationUpdated"));
    } else {
      await fetch("/api/logistics-reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      toast.success(t("reservationCreated"));
    }
    setEditItem(null);
    fetchReservations();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/logistics-reservations/${id}`, { method: "DELETE" });
    toast.success(t("reservationDeleted"));
    fetchReservations();
  };

  const updateStatus = async (id: number, status: LogisticsStatus) => {
    await fetch(`/api/logistics-reservations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    toast.success(t("statusUpdated"));
    fetchReservations();
  };

  const filtered = useMemo(() => {
    if (statusFilter === "todas") return reservations;
    return reservations.filter(r => r.status === statusFilter);
  }, [reservations, statusFilter]);

  const STATUS_FILTERS = [
    { id: "todas", label: t("filterStatusAll") },
    { id: "pendiente", label: t("statusPending") },
    { id: "confirmada", label: t("statusConfirmed") },
    { id: "en_ruta", label: t("statusEnRoute") },
    { id: "entregada", label: t("statusDelivered") },
    { id: "devuelta", label: t("statusReturned") },
    { id: "cancelada", label: t("statusCancelled") },
  ];

  if (loading) return <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-3)" }}>{t("loadingReservations")}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Filter row */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        {STATUS_FILTERS.map(f => (
          <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{ padding: "5px 12px", borderRadius: 999, border: "1px solid var(--line-1)", background: statusFilter === f.id ? "var(--ink-1)" : "var(--bg-panel)", color: statusFilter === f.id ? "white" : "var(--ink-2)", fontSize: 12, cursor: "pointer", fontWeight: statusFilter === f.id ? 600 : 400 }}>
            {f.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => { setEditItem(null); setDrawerOpen(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--ink-1)", color: "white", border: "none", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <IcoPlus /> {t("newReservationBtn")}
        </button>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-3)" }}>
          <IcoMov size={32} />
          <div style={{ marginTop: 12, fontSize: 14, fontWeight: 500 }}>{t("noReservations")}</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>{t("noReservationsHint")}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(r => {
            const st = STATUS_STYLE[r.status || "pendiente"] || STATUS_STYLE.pendiente;
            const locationLabel = r.warehouseType === "movil" ? t("inVan") : r.warehouseType === "fijo" ? t("inWarehouse") : r.itemsLocation || "—";
            return (
              <div key={r.id} style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: 14, padding: 16 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-1)" }}>{r.eventName || t("noEventName")}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: st.bg, color: st.fg }}>
                    {st.label}
                  </span>
                  {r.warehouseName && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 500, background: "var(--bg-subtle)", color: "var(--ink-2)", border: "1px solid var(--line-1)" }}>
                      {locationLabel}
                    </span>
                  )}
                  <div style={{ flex: 1 }} />
                  <button onClick={() => { setEditItem(r); setDrawerOpen(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4, display: "flex" }}>
                    <IcoEdit size={13} />
                  </button>
                  <button onClick={() => handleDelete(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#B55450", padding: 4, display: "flex" }}>
                    <IcoTrash size={13} />
                  </button>
                </div>

                {/* Metadata */}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--ink-3)", marginBottom: 10 }}>
                  {r.date && <span>📅 {fmtDate(r.date)}</span>}
                  {r.timeFrom && r.timeTo && <span>🕐 {r.timeFrom}–{r.timeTo}</span>}
                  {r.warehouseName && <span>🚐 {r.warehouseName}</span>}
                  {r.venue && <span>📍 {r.venue}{r.venueCity ? `, ${r.venueCity}` : ""}</span>}
                </div>

                {/* Product chips */}
                {r.items && r.items.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {r.items.map(item => (
                      <span key={item.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999, fontSize: 11.5, background: "var(--bg-subtle)", color: "var(--ink-2)", border: "1px solid var(--line-1)" }}>
                        {item.productName} ×{item.quantity}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {r.status === "pendiente" && (
                    <button onClick={() => updateStatus(r.id, "confirmada")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: "var(--r-sm)", border: "1px solid #4A6A94", background: "transparent", color: "#4A6A94", fontSize: 12, cursor: "pointer" }}>
                      {t("confirmAction")}
                    </button>
                  )}
                  {r.status === "confirmada" && (
                    <button onClick={() => updateStatus(r.id, "en_ruta")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: "var(--r-sm)", border: "1px solid #C4874A", background: "transparent", color: "#C4874A", fontSize: 12, cursor: "pointer" }}>
                      {t("enRouteAction")}
                    </button>
                  )}
                  {r.status === "en_ruta" && (
                    <button onClick={() => updateStatus(r.id, "entregada")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: "var(--r-sm)", border: "1px solid #4F7A5E", background: "transparent", color: "#4F7A5E", fontSize: 12, cursor: "pointer" }}>
                      <IcoDone size={13} /> {t("deliverAction")}
                    </button>
                  )}
                  {r.status === "entregada" && (
                    <button onClick={() => updateStatus(r.id, "devuelta")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: "var(--r-sm)", border: "1px solid #6B3F8A", background: "transparent", color: "#6B3F8A", fontSize: 12, cursor: "pointer" }}>
                      {t("returnAction")}
                    </button>
                  )}
                  {(r.status === "en_ruta" || r.status === "confirmada" || r.status === "pendiente") && (
                    <button onClick={() => updateStatus(r.id, "cancelada")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "transparent", color: "var(--ink-3)", fontSize: 12, cursor: "pointer" }}>
                      {t("cancelAction")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {drawerOpen && (
        <ReservationDrawer
          initial={editItem}
          warehouses={whs}
          products={products}
          onSave={handleSave}
          onClose={() => { setDrawerOpen(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
type Tab = "almacenes" | "stock" | "movimientos" | "reservas";

export default function LogisticsPage() {
  const t = useTranslations("logistics");
  const [activeTab, setActiveTab] = useState<Tab>("almacenes");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movementDrawerOpen, setMovementDrawerOpen] = useState(false);
  const [openNewWarehouse, setOpenNewWarehouse] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    const res = await fetch("/api/warehouses");
    const data = await res.json();
    if (data.success) setWarehouses(data.data);
  }, []);

  const fetchProducts = useCallback(async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    if (data.success) setProducts(data.data);
  }, []);

  useEffect(() => {
    fetchWarehouses();
    fetchProducts();
  }, [fetchWarehouses, fetchProducts]);

  // Derived stats
  const fixedWarehouses = warehouses.filter(w => w.type === "fijo");
  const vans = warehouses.filter(w => w.type === "movil");
  const vansAvailable = vans.filter(v => !v.eventName).length;
  const lowStockProducts = products.filter(p => p.stock != null && p.stockMin != null && p.stock <= p.stockMin);

  const TABS: { id: Tab; label: string }[] = [
    { id: "almacenes",   label: t("tabWarehouses") },
    { id: "stock",       label: t("tabGlobalStock") },
    { id: "movimientos", label: t("tabMovements") },
    { id: "reservas",    label: t("tabReservations") },
  ];

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: "16px 18px" }}>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500, marginBottom: 6 }}>{t("fixedWarehousesCard")}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#4F7A5E", letterSpacing: "-0.02em", lineHeight: 1 }}>{fixedWarehouses.length}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>{t("physicalLocations")}</div>
        </div>
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: "16px 18px" }}>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500, marginBottom: 6 }}>{t("vansCard")}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#C4874A", letterSpacing: "-0.02em", lineHeight: 1 }}>{vans.length - vansAvailable}/{vans.length}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>{vansAvailable} disponible{vansAvailable !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: "16px 18px" }}>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500, marginBottom: 6 }}>{t("activeReservationsCard")}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#7B5EA7", letterSpacing: "-0.02em", lineHeight: 1 }}>—</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>{t("confirmedOrEnRoute")}</div>
        </div>
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: "16px 18px" }}>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500, marginBottom: 6 }}>{t("stockAlertsCard")}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: lowStockProducts.length > 0 ? "#B55450" : "#4F7A5E", letterSpacing: "-0.02em", lineHeight: 1 }}>{lowStockProducts.length}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>{t("productsBelowMin")}</div>
        </div>
      </div>

      {/* Tab bar + título */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "1px solid var(--line-1)", marginBottom: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-1)", paddingRight: 20, borderRight: "1px solid var(--line-1)", marginRight: 4, lineHeight: 1, alignSelf: "center" }}>{t("warehouseTitle")}</span>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "12px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? "var(--ink-1)" : "var(--ink-3)",
              borderBottom: activeTab === t.id ? "2px solid var(--ink-1)" : "2px solid transparent",
              marginBottom: -1,
              transition: "color .15s",
            }}
          >
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, padding: "8px 0" }}>
          {activeTab === "almacenes" && (
            <button
              onClick={() => setOpenNewWarehouse(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--bg-subtle)", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", fontSize: 12.5, cursor: "pointer", color: "var(--ink-2)", fontWeight: 500 }}
            >
              <IcoPlus /> {t("newWarehouseBtn")}
            </button>
          )}
          <button
            onClick={() => setMovementDrawerOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#4A6A94", border: "none", borderRadius: "var(--r-sm)", fontSize: 12.5, cursor: "pointer", color: "#fff", fontWeight: 500 }}
          >
            <IcoPlus /> {t("newMovementBtn")}
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "almacenes" && (
        <WarehousesTab
          warehouses={warehouses}
          products={products}
          onRefetch={() => { fetchWarehouses(); fetchProducts(); }}
          onNewMovement={() => setMovementDrawerOpen(true)}
          openNew={openNewWarehouse}
          onNewConsumed={() => setOpenNewWarehouse(false)}
        />
      )}
      {activeTab === "stock" && (
        <StockGlobalTab products={products} warehouses={warehouses} />
      )}
      {activeTab === "movimientos" && (
        <MovementsTab
          products={products}
          warehouses={warehouses}
          movementDrawerOpen={movementDrawerOpen}
          onMovementDrawerClose={() => setMovementDrawerOpen(false)}
        />
      )}
      {activeTab === "reservas" && (
        <ReservasTab warehouses={warehouses} products={products} />
      )}

      {/* Global movement drawer (when triggered from outside the Movements tab) */}
      {movementDrawerOpen && activeTab !== "movimientos" && (
        <MovementDrawer
          products={products}
          warehouses={warehouses}
          onSave={async (data) => {
            await fetch("/api/stock-movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            toast.success(t("movementRegistered"));
          }}
          onClose={() => setMovementDrawerOpen(false)}
        />
      )}
    </div>
  );
}
