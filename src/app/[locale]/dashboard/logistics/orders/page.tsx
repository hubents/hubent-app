"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { RiAddLine, RiSearchLine, RiFileList2Line, RiCloseLine, RiMoreLine, RiEditLine, RiDeleteBinLine, RiCheckLine } from "@remixicon/react";

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderStatus = "borrador" | "pendiente" | "en_preparacion" | "listo" | "entregado" | "cancelado";

interface OrderItem {
  id?: number;
  productId?: number | null;
  productName: string;
  quantity: number;
  description?: string;
  hasService?: boolean;
  serviceTitle?: string;
  serviceTimeFrom?: string;
  serviceTimeTo?: string;
  serviceWorkerName?: string;
  serviceLocation?: string;
  serviceNotes?: string;
}

interface Order {
  id: number;
  eventId?: number | null;
  eventName?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  date?: string | null;
  linkedDocId?: string | null;
  linkedDocType?: string | null;
  status: OrderStatus;
  notes?: string | null;
  createdAt: string;
  items: OrderItem[];
}

interface Event { id: number; name: string; date?: string | null; }
interface Product { id: number; name: string; sku?: string; type: string; stock?: number | null; }

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<OrderStatus, { bg: string; fg: string; label: string }> = {
  borrador:       { bg: "#F0F0EE", fg: "#666",    label: "Borrador" },
  pendiente:      { bg: "#FFF3DC", fg: "#8A671F", label: "Pendiente" },
  en_preparacion: { bg: "#E8F0FF", fg: "#3A5B8A", label: "En preparación" },
  listo:          { bg: "#E8F5EE", fg: "#2F7A4F", label: "Listo" },
  entregado:      { bg: "#EDE8FF", fg: "#5B3FA8", label: "Entregado" },
  cancelado:      { bg: "#FBEDEC", fg: "#B55450", label: "Cancelado" },
};

const STATUS_FLOW: Record<OrderStatus, { next: OrderStatus; label: string } | null> = {
  borrador:       { next: "pendiente",      label: "Confirmar" },
  pendiente:      { next: "en_preparacion", label: "Preparar" },
  en_preparacion: { next: "listo",          label: "Marcar listo" },
  listo:          { next: "entregado",      label: "Entregar" },
  entregado:      null,
  cancelado:      null,
};

const INP: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid var(--line-1)",
  borderRadius: "var(--r-sm)", background: "var(--bg-panel)", color: "var(--ink-1)",
  fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

function FL({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500, display: "block", marginBottom: 4 }}>{children}</label>;
}

function DrawerSection({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 2px" }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: "var(--ink-3)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "var(--line-1)" }} />
    </div>
  );
}

// ─── Initials helper ──────────────────────────────────────────────────────────
function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = ["#4A6A94", "#7B5EA7", "#4F7A5E", "#C4874A", "#B55450", "#3A8A8A"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── OrderDrawer ─────────────────────────────────────────────────────────────
function OrderDrawer({
  editing, events, products, onClose, onSave,
}: {
  editing?: Order | null;
  events: Event[];
  products: Product[];
  onClose: () => void;
  onSave: (data: Partial<Order>) => Promise<void>;
}) {
  const t = useTranslations("logistics");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    eventId: editing?.eventId?.toString() || "",
    eventName: editing?.eventName || "",
    clientName: editing?.clientName || "",
    clientEmail: editing?.clientEmail || "",
    clientPhone: editing?.clientPhone || "",
    date: editing?.date || "",
    linkedDocId: editing?.linkedDocId || "",
    status: (editing?.status || "borrador") as OrderStatus,
    notes: editing?.notes || "",
  });
  const [items, setItems] = useState<OrderItem[]>(
    editing?.items?.length
      ? editing.items.map(i => ({ ...i }))
      : [{ productName: "", quantity: 1, hasService: false }]
  );

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleEventChange = (eventId: string) => {
    const ev = events.find(e => e.id.toString() === eventId);
    setForm(f => ({
      ...f,
      eventId,
      eventName: ev ? ev.name : f.eventName,
      date: ev?.date ? ev.date.split("T")[0] : f.date,
    }));
  };

  const addItem = () => setItems(i => [...i, { productName: "", quantity: 1, hasService: false }]);
  const removeItem = (idx: number) => setItems(i => i.filter((_, j) => j !== idx));
  const setItem = (idx: number, key: string, val: unknown) =>
    setItems(i => i.map((item, j) => j === idx ? { ...item, [key]: val } : item));

  const handleProductPick = (idx: number, productId: string) => {
    const prod = products.find(p => p.id.toString() === productId);
    setItems(i => i.map((item, j) => j === idx
      ? { ...item, productId: prod ? prod.id : null, productName: prod?.name || "" }
      : item
    ));
  };

  const handleSave = async () => {
    if (!form.eventName.trim() && !form.clientName.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        eventId: form.eventId ? Number(form.eventId) : null,
        items: items.filter(i => i.productName.trim() || i.productId),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const canSave = form.eventName.trim() || form.clientName.trim();

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.45)", display: "flex", justifyContent: "flex-end", zIndex: 50, backdropFilter: "blur(2px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(540px, 96vw)", background: "var(--bg-panel)", boxShadow: "-12px 0 32px rgba(0,0,0,.14)", display: "flex", flexDirection: "column", height: "100%", borderLeft: "1px solid var(--line-1)" }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: "var(--r-sm)", background: "var(--bg-subtle)", border: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <RiFileList2Line size={16} color="var(--ink-2)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{editing ? t("orders.editOrder") : t("orders.newOrder")}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>{t("orders.orderWorkSubtitle")}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 6, display: "flex", borderRadius: 6 }}>
            <RiCloseLine size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <DrawerSection label={t("orders.section1Event")} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <FL>{t("orders.eventLabel")}</FL>
                <select value={form.eventId} onChange={e => handleEventChange(e.target.value)} style={INP}>
                  <option value="">{t("orders.selectEventPlaceholder")}</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <FL>{t("orders.dateLabel")}</FL>
                <input style={INP} type="date" value={form.date} onChange={e => set("date", e.target.value)} />
              </div>
            </div>

            {!form.eventId && (
              <div>
                <FL>{t("orders.eventNameRequired")}</FL>
                <input style={INP} value={form.eventName} onChange={e => set("eventName", e.target.value)} placeholder={t("orders.eventNamePlaceholder")} />
              </div>
            )}

            <div>
              <FL>{t("orders.clientLabel")}</FL>
              <input style={INP} value={form.clientName} onChange={e => set("clientName", e.target.value)} placeholder={t("orders.clientPlaceholder")} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <FL>{t("orders.emailLabel")}</FL>
                <input style={INP} type="email" value={form.clientEmail} onChange={e => set("clientEmail", e.target.value)} placeholder={t("orders.emailPlaceholder")} />
              </div>
              <div>
                <FL>{t("orders.phoneLabel")}</FL>
                <input style={INP} type="tel" value={form.clientPhone} onChange={e => set("clientPhone", e.target.value)} placeholder={t("orders.phonePlaceholder")} />
              </div>
            </div>

            <DrawerSection label={t("orders.section2StatusRef")} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <FL>{t("orders.statusLabel")}</FL>
                <select value={form.status} onChange={e => set("status", e.target.value)} style={INP}>
                  {(Object.keys(STATUS_STYLE) as OrderStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_STYLE[s].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <FL>{t("orders.refDocLabel")}</FL>
                <input style={INP} value={form.linkedDocId} onChange={e => set("linkedDocId", e.target.value)} placeholder={t("orders.refDocPlaceholder")} />
              </div>
            </div>

            <DrawerSection label={t("orders.section3Materials")} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <FL>{t("orders.productLabel")}</FL>
                      <select value={item.productId?.toString() || ""} onChange={e => handleProductPick(idx, e.target.value)} style={{ ...INP, fontSize: 12.5 }}>
                        <option value="">{t("orders.selectProductPlaceholder")}</option>
                        {products.filter(p => p.type !== "servicio").map(p => (
                          <option key={p.id} value={p.id}>{p.name}{p.stock != null ? ` (${p.stock})` : ""}</option>
                        ))}
                      </select>
                      {!item.productId && (
                        <input style={{ ...INP, fontSize: 12.5, marginTop: 4 }} value={item.productName} onChange={e => setItem(idx, "productName", e.target.value)} placeholder={t("orders.writeProductPlaceholder")} />
                      )}
                    </div>
                    <div style={{ width: 68 }}>
                      <FL>{t("orders.quantityShort")}</FL>
                      <input style={{ ...INP, fontSize: 12.5, textAlign: "center" }} type="number" min="1" value={item.quantity} onChange={e => setItem(idx, "quantity", Number(e.target.value))} />
                    </div>
                    <button onClick={() => removeItem(idx)} style={{ marginBottom: 2, background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4, display: "flex", borderRadius: 4, flexShrink: 0 }}>
                      <RiCloseLine size={14} />
                    </button>
                  </div>
                  <input style={{ ...INP, fontSize: 12.5 }} value={item.description || ""} onChange={e => setItem(idx, "description", e.target.value)} placeholder={t("orders.descriptionInstructionsPlaceholder")} />
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--ink-2)" }}>
                    <input type="checkbox" checked={item.hasService || false} onChange={e => setItem(idx, "hasService", e.target.checked)} style={{ width: 14, height: 14, cursor: "pointer", flexShrink: 0 }} />
                    {t("orders.addServiceOrder")}
                  </label>
                  {item.hasService && (
                    <div style={{ borderTop: "1px solid var(--line-1)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div>
                        <FL>{t("orders.serviceTitleLabel")}</FL>
                        <input style={{ ...INP, fontSize: 12.5 }} value={item.serviceTitle || ""} onChange={e => setItem(idx, "serviceTitle", e.target.value)} placeholder={t("orders.serviceTitlePlaceholder")} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        <div><FL>{t("orders.startTimeLabel")}</FL><input style={{ ...INP, fontSize: 12.5 }} type="time" value={item.serviceTimeFrom || ""} onChange={e => setItem(idx, "serviceTimeFrom", e.target.value)} /></div>
                        <div><FL>{t("orders.endTimeLabel")}</FL><input style={{ ...INP, fontSize: 12.5 }} type="time" value={item.serviceTimeTo || ""} onChange={e => setItem(idx, "serviceTimeTo", e.target.value)} /></div>
                        <div><FL>{t("orders.workerLabel")}</FL><input style={{ ...INP, fontSize: 12.5 }} value={item.serviceWorkerName || ""} onChange={e => setItem(idx, "serviceWorkerName", e.target.value)} placeholder={t("orders.workerPlaceholder")} /></div>
                      </div>
                      <div><FL>{t("orders.locationLabel")}</FL><input style={{ ...INP, fontSize: 12.5 }} value={item.serviceLocation || ""} onChange={e => setItem(idx, "serviceLocation", e.target.value)} placeholder={t("orders.locationPlaceholder")} /></div>
                      <div>
                        <FL>{t("orders.serviceNotesLabel")}</FL>
                        <textarea style={{ ...INP, fontSize: 12.5, resize: "vertical", minHeight: 56 } as React.CSSProperties} value={item.serviceNotes || ""} onChange={e => setItem(idx, "serviceNotes", e.target.value)} placeholder={t("orders.serviceNotesPlaceholder")} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addItem} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", border: "1px dashed var(--line-strong)", borderRadius: "var(--r-sm)", background: "transparent", color: "var(--ink-3)", fontSize: 12.5, cursor: "pointer" }}>
                <RiAddLine size={14} /> {t("orders.addProductBtn")}
              </button>
            </div>

            <DrawerSection label={t("orders.internalNotesSection")} />
            <div style={{ paddingBottom: 20 }}>
              <textarea style={{ ...INP, resize: "vertical", minHeight: 70 } as React.CSSProperties} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder={t("orders.internalNotesPlaceholder")} />
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 22px", borderTop: "1px solid var(--line-1)", display: "flex", gap: 8, justifyContent: "flex-end", background: "var(--bg-panel)", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "var(--bg-panel)", color: "var(--ink-2)", fontSize: 13, cursor: "pointer" }}>
            {t("orders.cancelBtn")}
          </button>
          <button onClick={handleSave} disabled={saving || !canSave} style={{ padding: "8px 18px", borderRadius: "var(--r-sm)", border: "none", background: "#4A6A94", color: "white", fontSize: 13, fontWeight: 500, cursor: canSave ? "pointer" : "not-allowed", opacity: (!canSave || saving) ? 0.5 : 1 }}>
            {saving ? t("orders.savingBtn") : editing ? t("orders.saveChangesBtn") : t("orders.createOrderBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Row menu ─────────────────────────────────────────────────────────────────
function RowMenu({ order, onEdit, onDelete, onStatusChange }: {
  order: Order;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: OrderStatus) => void;
}) {
  const t = useTranslations("logistics");
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const flow = STATUS_FLOW[order.status];

  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div style={{ position: "relative" }} onMouseDown={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: open ? "var(--bg-subtle)" : "transparent", color: "var(--ink-2)", cursor: "pointer" }}>
        <RiMoreLine size={14} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", boxShadow: "0 6px 18px rgba(0,0,0,.13)", zIndex: 40, minWidth: 160, overflow: "hidden", padding: 4 }}>
          <button onClick={() => { onEdit(); setOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--ink-1)", borderRadius: "var(--r-sm)" }}>
            <RiEditLine size={13} /> {t("orders.editBtn")}
          </button>
          {flow && (
            <button onClick={() => { onStatusChange(flow.next); setOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "#4F7A5E", borderRadius: "var(--r-sm)" }}>
              <RiCheckLine size={13} /> {flow.label}
            </button>
          )}
          {order.status !== "cancelado" && order.status !== "entregado" && (
            <button onClick={() => { onStatusChange("cancelado"); setOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--ink-3)", borderRadius: "var(--r-sm)" }}>
              {t("orders.cancelOrderBtn")}
            </button>
          )}
          <div style={{ height: 1, background: "var(--line-1)", margin: "4px 0" }} />
          {confirmDel ? (
            <div style={{ display: "flex", gap: 4, padding: "4px 6px" }}>
              <button onClick={() => { onDelete(); setOpen(false); }} style={{ flex: 1, padding: "6px 8px", background: "#FBEDEC", border: "none", borderRadius: "var(--r-sm)", color: "#B55450", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>{t("orders.confirmDeleteBtn")}</button>
              <button onClick={() => setConfirmDel(false)} style={{ flex: 1, padding: "6px 8px", background: "var(--bg-subtle)", border: "none", borderRadius: "var(--r-sm)", color: "var(--ink-2)", fontSize: 12, cursor: "pointer" }}>{t("orders.cancelBtn")}</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "#B55450", borderRadius: "var(--r-sm)" }}>
              <RiDeleteBinLine size={13} /> {t("orders.deleteBtn")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const t = useTranslations("logistics");
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/logistics-orders");
    const data = await res.json();
    if (data.success) setOrders(data.data);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchOrders(),
      fetch("/api/events").then(r => r.json()).then(d => { if (d.success || Array.isArray(d.data)) setEvents(d.data || []); }),
      fetch("/api/products").then(r => r.json()).then(d => { if (d.success) setProducts(d.data || []); }),
    ]).finally(() => setLoading(false));
  }, [fetchOrders]);

  const handleSave = async (data: Partial<Order>) => {
    const url = editItem ? `/api/logistics-orders/${editItem.id}` : "/api/logistics-orders";
    await fetch(url, { method: editItem ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    await fetchOrders();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/logistics-orders/${id}`, { method: "DELETE" });
    setOrders(o => o.filter(x => x.id !== id));
    setSelected(s => { const n = new Set(s); n.delete(id); return n; });
  };

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    await fetch(`/api/logistics-orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setOrders(o => o.map(x => x.id === order.id ? { ...x, status } : x));
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return !q || (o.eventName || "").toLowerCase().includes(q) || (o.clientName || "").toLowerCase().includes(q) || (o.linkedDocId || "").toLowerCase().includes(q);
  });

  // Stats
  const soloCart   = orders.filter(o => o.items.length > 0 && !o.items.some(i => i.hasService));
  const cartSvc    = orders.filter(o => o.items.some(i => i.hasService));
  const delivered  = orders.filter(o => o.status === "entregado");

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(o => o.id)));
    }
  };

  const COL = "40px 1fr 100px 100px 170px 130px 44px";

  const TH = (label: string, center = false): React.CSSProperties => ({
    padding: "9px 12px",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--ink-3)",
    textTransform: "uppercase" as const,
    letterSpacing: ".06em",
    textAlign: center ? "center" : "left",
    borderLeft: "1px solid var(--line-1)",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>

      {/* ── Stats bar ── */}
      {orders.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { label: t("orders.statTotalOrders"), value: orders.length, sub: t("orders.statRegistered"), color: "var(--ink-1)" },
            { label: t("orders.statOnlyCargo"),   value: soloCart.length, sub: `${orders.length ? Math.round(soloCart.length/orders.length*100) : 0}% del total`, color: "#4A6A94" },
            { label: t("orders.statCargoService"), value: cartSvc.length,  sub: `${orders.length ? Math.round(cartSvc.length/orders.length*100) : 0}% del total`,  color: "#7B5EA7" },
            { label: t("orders.statDelivered"),   value: delivered.length, sub: `${orders.length ? Math.round(delivered.length/orders.length*100) : 0}% del total`, color: "#4F7A5E" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: "14px 18px" }}>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <RiSearchLine size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("orders.searchPlaceholder")} style={{ ...INP, paddingLeft: 30 }} />
        </div>
        <button
          onClick={() => { setEditItem(null); setDrawerOpen(true); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: "var(--r-sm)", border: "none", background: "#4A6A94", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", flexShrink: 0 }}
        >
          <RiAddLine size={14} /> {t("orders.createOrderToolbarBtn")}
        </button>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--ink-3)", fontSize: 13 }}>{t("orders.loadingOrders")}</div>
      ) : orders.length === 0 ? (
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: 56, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RiFileList2Line size={22} color="var(--ink-3)" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)" }}>{t("orders.noOrdersTitle")}</div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", maxWidth: 360, lineHeight: 1.5 }}>{t("orders.noOrdersDescription")}</div>
          <button onClick={() => { setEditItem(null); setDrawerOpen(true); }} style={{ marginTop: 4, padding: "8px 18px", borderRadius: "var(--r-sm)", border: "none", background: "#4A6A94", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            {t("orders.createFirstOrderBtn")}
          </button>
        </div>
      ) : (
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: COL, background: "var(--bg-subtle)", borderBottom: "1px solid var(--line-1)" }}>
            <div style={{ padding: "9px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleAll}
                style={{ width: 14, height: 14, cursor: "pointer" }}
              />
            </div>
            <div style={{ ...TH("CLIENTE"), borderLeft: "none" }}>{t("orders.colClient")}</div>
            <div style={TH("FECHA", true)}>{t("orders.colDate")}</div>
            <div style={TH("NÚMERO", true)}>{t("orders.colNumber")}</div>
            <div style={TH("CONTENIDO")}>{t("orders.colContent")}</div>
            <div style={TH("ESTADO", true)}>{t("orders.colStatus")}</div>
            <div style={{ ...TH(""), borderLeft: "1px solid var(--line-1)" }} />
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              {t("orders.noOrdersMatchSearch")}
            </div>
          ) : filtered.map((order, idx) => {
            const name = order.eventName || order.clientName || "Sin nombre";
            const color = getAvatarColor(name);
            const initials = getInitials(name);
            const st = STATUS_STYLE[order.status];
            const hasService = order.items.some(i => i.hasService);
            const hasCargo = order.items.length > 0;
            const docNum = order.linkedDocId || `ORD-${String(order.id).padStart(3, "0")}`;
            const isSelected = selected.has(order.id);
            const isLast = idx === filtered.length - 1;

            return (
              <div
                key={order.id}
                style={{ display: "grid", gridTemplateColumns: COL, borderBottom: isLast ? "none" : "1px solid var(--line-1)", alignItems: "center", background: isSelected ? "color-mix(in srgb, #4A6A94 5%, var(--bg-panel))" : "transparent", transition: "background .1s" }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--bg-subtle)"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Checkbox */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 0" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => setSelected(s => { const n = new Set(s); isSelected ? n.delete(order.id) : n.add(order.id); return n; })}
                    style={{ width: 14, height: 14, cursor: "pointer" }}
                  />
                </div>

                {/* Cliente */}
                <div style={{ padding: "12px 12px", display: "flex", alignItems: "center", gap: 10, minWidth: 0, borderLeft: "1px solid var(--line-1)" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                    {order.clientName && order.eventName && (
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.clientName}</div>
                    )}
                  </div>
                </div>

                {/* Fecha */}
                <div style={{ padding: "12px", textAlign: "center", fontSize: 12.5, color: "var(--ink-2)", borderLeft: "1px solid var(--line-1)" }}>
                  {order.date
                    ? new Date(order.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
                    : <span style={{ color: "var(--ink-4)" }}>—</span>
                  }
                </div>

                {/* Número */}
                <div style={{ padding: "12px", textAlign: "center", borderLeft: "1px solid var(--line-1)" }}>
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--ink-2)", background: "var(--bg-subtle)", border: "1px solid var(--line-1)", borderRadius: 4, padding: "2px 6px" }}>
                    {docNum}
                  </span>
                </div>

                {/* Contenido */}
                <div style={{ padding: "12px", display: "flex", gap: 6, flexWrap: "wrap", borderLeft: "1px solid var(--line-1)" }}>
                  {hasCargo && (
                    <span style={{ fontSize: 11.5, background: "#E8EEF6", color: "#4A6A94", borderRadius: 999, padding: "2px 9px", fontWeight: 500 }}>
                      {t("orders.tagCargo")}
                    </span>
                  )}
                  {hasService && (
                    <span style={{ fontSize: 11.5, background: "#EDE8FF", color: "#7B5EA7", borderRadius: 999, padding: "2px 9px", fontWeight: 500 }}>
                      {t("orders.tagService")}
                    </span>
                  )}
                  {!hasCargo && !hasService && (
                    <span style={{ fontSize: 12, color: "var(--ink-4)" }}>—</span>
                  )}
                  {order.items.length > 0 && (
                    <span style={{ fontSize: 11, color: "var(--ink-4)", alignSelf: "center" }}>
                      {order.items.length} {order.items.length === 1 ? t("orders.itemSingular") : t("orders.itemPlural")}
                    </span>
                  )}
                </div>

                {/* Estado */}
                <div style={{ padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid var(--line-1)" }}>
                  <span style={{ background: st.bg, color: st.fg, fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
                    {st.label}
                  </span>
                </div>

                {/* Acciones */}
                <div style={{ padding: "12px 8px", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid var(--line-1)" }}>
                  <RowMenu
                    order={order}
                    onEdit={() => { setEditItem(order); setDrawerOpen(true); }}
                    onDelete={() => handleDelete(order.id)}
                    onStatusChange={status => handleStatusChange(order, status)}
                  />
                </div>
              </div>
            );
          })}

          {/* Footer */}
          {filtered.length > 0 && (
            <div style={{ padding: "8px 12px", borderTop: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-subtle)" }}>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                {filtered.length} {filtered.length === 1 ? t("orders.orderSingular") : t("orders.orderPlural")}{selected.size > 0 && ` · ${selected.size} ${selected.size > 1 ? t("orders.selectedPlural") : t("orders.selectedSingular")}`}
              </span>
              <span style={{ fontSize: 12, color: "var(--ink-4)" }}>
                {orders.length !== filtered.length && `${orders.length} en total`}
              </span>
            </div>
          )}
        </div>
      )}

      {drawerOpen && (
        <OrderDrawer
          editing={editItem}
          events={events}
          products={products}
          onClose={() => { setDrawerOpen(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
