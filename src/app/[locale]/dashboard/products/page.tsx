"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  ShoppingBag01Icon,
  PlusSignIcon,
  Search01Icon,
  PencilEdit02Icon,
  Delete01Icon,
  Cancel01Icon,
  InformationCircleIcon,
  LayoutGridIcon,
  ListViewIcon,
  Alert01Icon,
  FilterIcon,
  Sorting01Icon,
} from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Btn, Inp, Ta, FieldLabel, PageHeader, Divider as DsDivider } from "@/components/ui/ds";
import { fmtMoney as fmt } from "@/lib/format";

const IcoProducts = hgIcon(ShoppingBag01Icon);
const IcoPlus = hgIcon(PlusSignIcon);
const IcoSearch = hgIcon(Search01Icon);
const IcoEdit = hgIcon(PencilEdit02Icon);
const IcoDelete = hgIcon(Delete01Icon);
const IcoClose = hgIcon(Cancel01Icon);
const IcoInfo = hgIcon(InformationCircleIcon);
const IcoGrid = hgIcon(LayoutGridIcon);
const IcoList = hgIcon(ListViewIcon);
const IcoAlert = hgIcon(Alert01Icon);
const IcoFilter = hgIcon(FilterIcon);
const IcoSort = hgIcon(Sorting01Icon);

// ── Types ──────────────────────────────────────────────────────
type ProductType = "fisico" | "servicio" | "paquete";
type ProductSubtype = "alquiler" | "venta" | "servicio";

interface Product {
  id: number;
  sku: string | null;
  name: string;
  type: ProductType | null;
  subtype: ProductSubtype | null;
  category: string | null;
  description: string | null;
  detail: string | null;
  unitPrice: string | null;
  taxRate: string | null;
  cost: string | null;
  unit: string | null;
  stock: number | null;
  stockMin: number | null;
  color: string | null;
  initials: string | null;
  isActive: boolean | null;
  warehouseName?: string | null;
}

// ── Constants ──────────────────────────────────────────────────
const PRODUCT_TYPE_STYLE: Record<ProductType, { bg: string; fg: string; label: string }> = {
  fisico:   { bg: "#E8EFF7", fg: "#3A5B8A", label: "Físico" },
  servicio: { bg: "#EDE7DC", fg: "#5C4A2E", label: "Servicio" },
  paquete:  { bg: "#EEE6F5", fg: "#6B3F8A", label: "Paquete" },
};
const SUBTYPE_STYLE: Record<ProductSubtype, { bg: string; fg: string; label: string }> = {
  alquiler: { bg: "#D9ECD1", fg: "#1F6A3A", label: "Alquiler" },
  venta:    { bg: "#FEF3CD", fg: "#8A6D00", label: "Venta" },
  servicio: { bg: "#EDE7DC", fg: "#5C4A2E", label: "Servicio" },
};

const PRODUCT_CATEGORIES = [
  "Mobiliario", "Decoración", "Textil", "Iluminación", "Audiovisual",
  "Florística", "Catering y menaje", "Fotografía y vídeo", "Coordinación", "Transporte", "Otros",
];
const VAT_RATES = [0, 4, 10, 21];

const totalWithVat = (price: string | number | null, vat: string | number | null) => {
  if (price == null || vat == null) return null;
  return Number(price) * (1 + Number(vat) / 100);
};

// ── Avatar ─────────────────────────────────────────────────────
function ProductAvatar({ product }: { product: Product }) {
  const bg = product.color || "#8B7355";
  const letters = product.initials || product.name.slice(0, 2).toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[12px] font-bold"
      style={{ background: bg }}
    >
      {letters}
    </div>
  );
}

// ── TypePill / SubtypePill ──────────────────────────────────────
function TypePill({ type }: { type: ProductType | null }) {
  if (!type) return null;
  const m = PRODUCT_TYPE_STYLE[type];
  return (
    <span className="text-[9px] font-medium px-1.5 py-0 rounded leading-4" style={{ background: m.bg, color: m.fg }}>
      {m.label}
    </span>
  );
}
function SubtypePill({ subtype }: { subtype: ProductSubtype | null }) {
  if (!subtype) return null;
  const m = SUBTYPE_STYLE[subtype];
  return (
    <span className="text-[9px] font-medium px-1.5 py-0 rounded leading-4" style={{ background: m.bg, color: m.fg }}>
      {m.label}
    </span>
  );
}

const FL = FieldLabel;
const Divider = ({ label }: { label: string }) => <DsDivider label={label} style={{ marginTop: 8, paddingTop: 8 }} />;

// ── Native select (matches prototype style) ────────────────────
function NativeSelect({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string | number;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full border border-[var(--line-1)] rounded-md px-3 py-2 text-[13.5px] bg-transparent text-[var(--ink-1)] focus:outline-none focus:ring-1 focus:ring-[var(--line-strong)] disabled:opacity-50"
    >
      {children}
    </select>
  );
}

// ── Product Drawer (fiel al prototipo) ─────────────────────────
const EMPTY_FORM = {
  name: "", sku: "", description: "", detail: "",
  type: "servicio" as ProductType, subtype: "servicio" as ProductSubtype,
  category: "Coordinación",
  stock: "", stockMin: "", cost: "", unitPrice: "", taxRate: 21,
  color: "#7B8FA1", initials: "",
};

function ProductDrawer({
  open,
  product,
  onClose,
  onSaved,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("products");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        name: product.name ?? "",
        sku: product.sku ?? "",
        description: product.description ?? "",
        detail: product.detail ?? "",
        type: product.type ?? "servicio",
        subtype: product.subtype ?? "servicio",
        category: product.category ?? "Coordinación",
        stock: product.stock?.toString() ?? "",
        stockMin: product.stockMin?.toString() ?? "",
        cost: product.cost ?? "",
        unitPrice: product.unitPrice ?? "",
        taxRate: Number(product.taxRate ?? 21),
        color: product.color ?? "#7B8FA1",
        initials: product.initials ?? "",
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [open, product]);

  const set = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const total = form.unitPrice !== "" && form.taxRate != null
    ? totalWithVat(form.unitPrice, form.taxRate)
    : null;

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const initials = form.initials ||
      form.name.split(" ").filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join("");
    const payload = {
      ...form,
      initials,
      stock: form.stock !== "" ? Number(form.stock) : null,
      stockMin: form.stockMin !== "" ? Number(form.stockMin) : null,
      cost: form.cost !== "" ? form.cost : null,
      unitPrice: form.unitPrice !== "" ? form.unitPrice : null,
    };
    try {
      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PATCH" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(20,18,12,0.35)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[480px] flex flex-col gap-3 overflow-y-auto"
        style={{
          background: "var(--bg-panel)",
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
          padding: "22px 24px",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--line-1)" }}
            >
              <IcoProducts className="h-[18px] w-[18px] text-[var(--ink-2)]" />
            </div>
            <div>
              <div className="text-[17px] font-semibold tracking-tight">
                {product ? t("drawer.editTitle") : t("drawer.createTitle")}
              </div>
              <div className="text-[12px] text-[var(--ink-3)] mt-0.5">
                {t("drawer.createDescription")}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <IcoClose className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* ── Tipo de producto ── */}
        <Divider label={t("drawer.sectionType")} />
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <FL>{t("drawer.fieldType")}</FL>
            <NativeSelect
              value={form.type}
              onChange={(v) => {
                const tp = v as ProductType;
                set("type", tp);
                if (tp === "servicio") set("subtype", "servicio");
                else set("subtype", "alquiler");
              }}
            >
              <option value="fisico">{t("drawer.typeFisico")}</option>
              <option value="servicio">{t("drawer.typeServicio")}</option>
              <option value="paquete">{t("drawer.typePaquete")}</option>
            </NativeSelect>
          </div>
          <div>
            <FL>{t("drawer.fieldModality")}</FL>
            <NativeSelect
              value={form.subtype}
              onChange={(v) => set("subtype", v as ProductSubtype)}
              disabled={form.type === "servicio"}
            >
              {form.type !== "servicio" && <option value="alquiler">{t("drawer.subtypeAlquiler")}</option>}
              {form.type !== "servicio" && <option value="venta">{t("drawer.subtypeVenta")}</option>}
              <option value="servicio">{t("drawer.subtypeServicio")}</option>
            </NativeSelect>
          </div>
        </div>

        {/* ── Información general ── */}
        <Divider label={t("drawer.sectionGeneral")} />
        <div>
          <FL>{t("drawer.fieldName")}</FL>
          <Inp
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={t("drawer.namePlaceholder")}
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <FL>{t("drawer.fieldSku")}</FL>
            <Inp
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
              placeholder={t("drawer.skuPlaceholder")}
            />
          </div>
          <div>
            <FL>{t("drawer.fieldCategory")}</FL>
            <NativeSelect value={form.category} onChange={(v) => set("category", v)}>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div>
          <FL>{t("drawer.fieldDescription")}</FL>
          <Ta
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder={t("drawer.descriptionPlaceholder")}
          />
        </div>
        <div>
          <FL>{t("drawer.fieldDetail")}</FL>
          <Ta
            rows={3}
            value={form.detail}
            onChange={(e) => set("detail", e.target.value)}
            placeholder={t("drawer.detailPlaceholder")}
          />
        </div>

        {/* ── Precios ── */}
        <Divider label={t("drawer.sectionPrices")} />
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <FL>{t("drawer.fieldCost")}</FL>
            <Inp
              type="number" min="0" step="0.01"
              value={form.cost}
              onChange={(e) => set("cost", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <FL>{t("drawer.fieldSalePrice")}</FL>
            <Inp
              type="number" min="0" step="0.01"
              value={form.unitPrice}
              onChange={(e) => set("unitPrice", e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <FL>{t("drawer.fieldVat")}</FL>
            <NativeSelect
              value={form.taxRate}
              onChange={(v) => set("taxRate", Number(v) as typeof form.taxRate)}
            >
              {VAT_RATES.map((r) => (
                <option key={r} value={r}>{r}%</option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <FL>{t("drawer.fieldTotalVat")}</FL>
            <div
              style={{
                padding: "9px 12px", borderRadius: 8, fontSize: 13,
                fontWeight: 600, color: "var(--ink-2)",
                background: "var(--bg-subtle)", border: "1px solid var(--line-1)",
              }}
            >
              {total != null ? fmt(total) : "—"}
            </div>
          </div>
        </div>

        {/* ── Inventario (solo físico / paquete) ── */}
        {form.type !== "servicio" && (
          <>
            <Divider label={t("drawer.sectionInventory")} />
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <FL>{t("drawer.fieldStock")}</FL>
                <Inp
                  type="number" min="0"
                  value={form.stock}
                  onChange={(e) => set("stock", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <FL hint={t("drawer.fieldStockMinHint")}>{t("drawer.fieldStockMin")}</FL>
                <Inp
                  type="number" min="0"
                  value={form.stockMin}
                  onChange={(e) => set("stockMin", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            {form.subtype === "alquiler" && (
              <div
                className="flex gap-2 items-start rounded-md px-3 py-2.5 text-[12px]"
                style={{
                  background: "#EEF6FF",
                  border: "1px solid #BFDBFE",
                  color: "#3A5B8A",
                }}
              >
                <IcoInfo className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  {t("drawer.rentalNote")}
                </span>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 12, marginTop: 8, borderTop: "1px solid var(--line-1)" }}>
          <Btn variant="outline" onClick={onClose}>{t("drawer.cancel")}</Btn>
          <Btn onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? t("drawer.saving") : product ? t("drawer.saveChanges") : t("drawer.create")}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function ProductsPage() {
  const t = useTranslations("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"todos" | ProductType>("todos");
  const [categoryFilter, setCategoryFilter] = useState<string>("Todas");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortField, setSortField] = useState<keyof Product | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.data ?? d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const tid = setTimeout(load, 0);
    return () => clearTimeout(tid);
  }, [load]);

  const openNew = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setDrawerOpen(true); };

  const TABS: { key: "todos" | ProductType; label: string }[] = [
    { key: "todos", label: t("tabs.todos") },
    { key: "fisico", label: t("tabs.fisico") },
    { key: "servicio", label: t("tabs.servicio") },
    { key: "paquete", label: t("tabs.paquete") },
  ];

  const lowStockCount = products.filter(
    (p) => p.stock != null && p.stockMin != null && p.stock <= p.stockMin
  ).length;

  // Client-side filter + sort
  const filtered: Product[] = products
    .filter((p) => {
      if (typeFilter !== "todos" && p.type !== typeFilter) return false;
      if (categoryFilter !== "Todas" && p.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const av = a[sortField];
      const bv = b[sortField];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortField(null); setSortDir("asc"); }
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const GRID_COLS = "2.5fr 1fr 1.2fr 1fr 1fr 0.7fr 0.9fr 0.9fr 0.6fr 0.9fr 44px";

  type SortableCol = { label: string; field: keyof Product | null };
  const COLS: SortableCol[] = [
    { label: t("cols.product"), field: "name" },
    { label: t("cols.sku"), field: "sku" },
    { label: t("cols.type"), field: "type" },
    { label: t("cols.category"), field: "category" },
    { label: t("cols.warehouse"), field: "warehouseName" },
    { label: t("cols.stock"), field: "stock" },
    { label: t("cols.cost"), field: "cost" },
    { label: t("cols.salePrice"), field: "unitPrice" },
    { label: t("cols.vat"), field: "taxRate" },
    { label: t("cols.total"), field: null },
    { label: "", field: null },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex gap-2 items-center flex-wrap">
        {/* Type tabs */}
        <div className="border border-[var(--line-1)] rounded-[8px] flex p-0.5 gap-0.5 bg-[var(--bg-subtle)]">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={`px-3 py-1.5 text-[12.5px] transition-colors cursor-pointer border-none ${
                typeFilter === t.key
                  ? "bg-white rounded-[6px] shadow-sm text-[var(--ink-1)] font-semibold"
                  : "text-[var(--ink-3)] hover:text-[var(--ink-2)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Category dropdown */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-[var(--line-1)] rounded-[8px] px-3 py-1.5 text-[12.5px] bg-white text-[var(--ink-1)] cursor-pointer"
          style={{ outline: "none" }}
        >
          <option value="Todas">{t("categoryAll")}</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Low stock badge */}
        {lowStockCount > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-medium"
            style={{ border: "1px solid #F59E0B", background: "#FFFBEB", color: "#92400E" }}
          >
            <IcoAlert className="h-3.5 w-3.5" />
            {lowStockCount !== 1 ? t("lowStockPlural", { count: lowStockCount }) : t("lowStock", { count: lowStockCount })}
          </div>
        )}

        {/* Search */}
        <div
          className="flex-1 min-w-[180px] max-w-[260px] flex items-center gap-2 bg-white rounded-[8px] px-3 py-1.5"
          style={{ border: "1px solid var(--line-1)" }}
        >
          <IcoSearch className="h-3.5 w-3.5 text-[var(--ink-3)] flex-shrink-0" />
          <input
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--ink-1)", fontFamily: "inherit" }}
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="text-[var(--ink-3)] p-0 border-none bg-transparent cursor-pointer"
              onClick={() => setSearch("")}
            >
              <IcoClose className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Spacer */}
        <div className="ml-auto" />

        {/* View toggle */}
        <div className="flex border border-[var(--line-1)] rounded-[8px] overflow-hidden">
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 cursor-pointer border-none transition-colors ${
              viewMode === "list"
                ? "bg-[var(--ink-1)] text-white"
                : "bg-white text-[var(--ink-3)] hover:bg-[var(--bg-subtle)]"
            }`}
          >
            <IcoList className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 cursor-pointer border-none transition-colors ${
              viewMode === "grid"
                ? "bg-[var(--ink-1)] text-white"
                : "bg-white text-[var(--ink-3)] hover:bg-[var(--bg-subtle)]"
            }`}
          >
            <IcoGrid className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Date input */}
        <input
          type="date"
          className="border border-[var(--line-1)] rounded-[8px] px-3 py-1.5 text-[12.5px] text-[var(--ink-2)] bg-white cursor-pointer"
          style={{ outline: "none" }}
        />

        {/* New product button */}
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-[8px] text-[13px] font-semibold text-white cursor-pointer border-none"
          style={{ background: "var(--primary)" }}
        >
          <IcoPlus className="h-3.5 w-3.5" />
          {t("newProduct")}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-14 rounded-xl bg-[var(--bg-subtle)] flex items-center justify-center">
            <IcoProducts className="h-6 w-6 text-[var(--ink-3)]" />
          </div>
          <p className="text-[14px] text-[var(--ink-3)]">
            {search || typeFilter !== "todos" || categoryFilter !== "Todas"
              ? t("emptyFiltered")
              : t("emptyDefault")}
          </p>
          {!search && typeFilter === "todos" && categoryFilter === "Todas" && (
            <Btn variant="outline" size="sm" onClick={openNew}>{t("createProduct")}</Btn>
          )}
        </div>
      ) : viewMode === "list" ? (
        /* ── List view ── */
        <div className="rounded-[12px] border border-[var(--line-1)] bg-white overflow-hidden">
          {/* Header */}
          <div
            className="grid sticky top-0 bg-[var(--bg-subtle)] border-b border-[var(--line-1)] px-4 py-3"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            {COLS.map((col, i) =>
              col.field ? (
                <button
                  key={i}
                  onClick={() => handleSort(col.field as keyof Product)}
                  className="flex items-center gap-1 cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)] border-none bg-transparent p-0"
                >
                  {col.label}
                  <IcoSort className="h-3 w-3 opacity-40" />
                </button>
              ) : (
                <span
                  key={i}
                  className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)]"
                >
                  {col.label}
                </span>
              )
            )}
          </div>

          {/* Rows */}
          {filtered.map((p) => (
            <div
              key={p.id}
              className="grid items-center px-4 py-3 border-b border-[var(--line-2)] last:border-b-0 hover:bg-[var(--bg-subtle)] transition-colors"
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              {/* PRODUCTO */}
              <div className="flex items-center gap-3 min-w-0">
                <ProductAvatar product={p} />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[var(--ink-1)] truncate">{p.name}</div>
                  <div className="text-[11px] text-[var(--ink-3)] truncate">{p.description || ""}</div>
                </div>
              </div>

              {/* SKU */}
              <div className="text-[12px] text-[var(--ink-2)] font-mono">{p.sku || "—"}</div>

              {/* TIPO */}
              <div className="flex flex-row flex-wrap gap-1">
                <TypePill type={p.type} />
                <SubtypePill subtype={p.subtype} />
              </div>

              {/* CATEGORÍA */}
              <div className="text-[12.5px] text-[var(--ink-2)]">{p.category || "—"}</div>

              {/* ALMACÉN */}
              <div className="text-[12.5px] text-[var(--ink-2)]">{p.warehouseName || "—"}</div>

              {/* STOCK */}
              <div>
                {p.stock != null ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[13px] font-medium text-[var(--ink-1)]">{p.stock}</span>
                    {p.stockMin != null && p.stock <= p.stockMin && (
                      <span style={{ color: "#F59E0B" }}>⚠</span>
                    )}
                  </div>
                ) : <span className="text-[var(--ink-3)]">—</span>}
              </div>

              {/* COSTE */}
              <div className="text-[12.5px] text-[var(--ink-2)]">
                {p.cost ? fmt(Number(p.cost)) : "—"}
              </div>

              {/* P. VENTA */}
              <div className="text-[12.5px] text-[var(--ink-2)]">
                {p.unitPrice ? fmt(Number(p.unitPrice)) : "—"}
              </div>

              {/* IVA */}
              <div className="text-[12.5px] text-[var(--ink-2)]">
                {p.taxRate ? p.taxRate + "%" : "—"}
              </div>

              {/* TOTAL */}
              <div className="text-[13px] font-bold text-[var(--ink-1)]">
                {totalWithVat(p.unitPrice, p.taxRate) != null
                  ? fmt(totalWithVat(p.unitPrice, p.taxRate)!)
                  : "—"}
              </div>

              {/* ACTIONS */}
              <div>
                <button
                  onClick={() => openEdit(p)}
                  className="p-1.5 rounded-[6px] hover:bg-[var(--bg-subtle)] text-[var(--ink-3)] hover:text-[var(--ink-1)] border-none bg-transparent cursor-pointer transition-colors"
                >
                  <IcoEdit className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Grid view ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((p) => {
            const total = totalWithVat(p.unitPrice, p.taxRate);
            return (
              <div
                key={p.id}
                onClick={() => openEdit(p)}
                className="rounded-[12px] border border-[var(--line-1)] bg-white p-4 hover:border-[var(--line-strong)] transition-colors cursor-pointer"
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <ProductAvatar product={p} />
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                    className="p-1.5 rounded-[6px] hover:bg-[var(--bg-subtle)] text-[var(--ink-3)] hover:text-[var(--ink-1)] border-none bg-transparent cursor-pointer transition-colors"
                  >
                    <IcoEdit className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Name + description */}
                <div className="mb-2">
                  <div className="text-[13.5px] font-semibold text-[var(--ink-1)] truncate">{p.name}</div>
                  {p.description && (
                    <div className="text-[11.5px] text-[var(--ink-3)] truncate mt-0.5">{p.description}</div>
                  )}
                </div>

                {/* Pills */}
                <div className="flex flex-wrap gap-1 mb-3">
                  <TypePill type={p.type} />
                  <SubtypePill subtype={p.subtype} />
                </div>

                {/* Bottom row: price + stock */}
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[var(--ink-1)]">
                    {total != null ? fmt(total) : "—"}
                  </span>
                  {p.stock != null && (
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] text-[var(--ink-2)]">{p.stock}</span>
                      {p.stockMin != null && p.stock <= p.stockMin && (
                        <span style={{ color: "#F59E0B" }}>⚠</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer stats */}
      {!loading && (
        <div className="text-[12px] text-[var(--ink-3)] px-1">
          {t("footerTotal", { count: products.length })}
          {lowStockCount > 0 ? t("footerLowStock", { count: lowStockCount }) : t("footerSeparator")}
          {t("footerShowing", { count: filtered.length })}
        </div>
      )}

      <ProductDrawer
        open={drawerOpen}
        product={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
