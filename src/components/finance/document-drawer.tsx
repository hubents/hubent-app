"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Delete01Icon,
  EyeIcon,
  Copy01Icon,
  Exchange01Icon,
  TruckIcon,
  Cancel01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { LiveDocumentPreview, type OrganizationPreviewData } from "./live-document-preview";
import { ContactSelector, type ContactSelectorValue } from "./contact-selector";
import { CURRENCIES, CURRENCY_SYMBOLS, DEFAULT_ENABLED_CURRENCIES } from "@/lib/constants/locale";
import { fmtMoney } from "@/lib/format";
import { appConfirm } from "@/lib/confirm";

type DocumentType = "quote" | "invoice" | "proforma" | "delivery_note" | "credit_note";

interface DocumentItem {
  id?: number;
  description: string;
  details?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
}

interface Event { id: number; name: string; }
interface TaxRate { id: number; name: string; rate: string; isDefault: boolean; isActive?: boolean; }
interface BankAccount { id: number; name: string; bankName: string | null; iban: string | null; swift: string | null; isDefault: boolean; }

interface InitialDocumentData {
  contactId?: number;
  vendorId?: number;
  eventId?: number;
  notes?: string;
  termsAndConditions?: string;
  globalDiscount?: number;
  globalDiscountType?: "percentage" | "fixed";
  paymentMethod?: string;
  bankAccountId?: number;
  items?: DocumentItem[];
}

interface DocumentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: DocumentType;
  documentId?: number;
  initialData?: InitialDocumentData;
  onSuccess?: () => void;
  onDuplicate?: () => void;
  onConvert?: (targetType: string) => void;
  saveEndpoint?: string;
  lockedEvent?: { id: number; name: string };
  lockedClientLabel?: string;
  eventsEndpoint?: string;
  vendorsEndpoint?: string;
}

const typeLabels: Record<DocumentType, string> = {
  quote: "Presupuesto",
  invoice: "Factura",
  proforma: "Proforma",
  delivery_note: "Albarán",
  credit_note: "Nota de Crédito",
};

const paymentMethodOptions = [
  { value: "bank_transfer", label: "Transferencia bancaria" },
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "stripe", label: "Stripe" },
  { value: "other", label: "Otro" },
];

const FIN_ACCOUNTS = [
  "70500000 Prestaciones de servicios",
  "70400000 Venta de mercaderías",
  "75000000 Otros ingresos",
];

// Shared input style
const INPUT: React.CSSProperties = {
  width: "100%", padding: "8px 10px", boxSizing: "border-box",
  border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)",
  background: "var(--bg-panel)", color: "var(--ink-1)",
  fontSize: 13, fontFamily: "inherit", outline: "none",
};

// Borderless input for the top strip cells
const STRIP_INPUT: React.CSSProperties = {
  width: "100%", padding: "4px 0", boxSizing: "border-box",
  border: "none", background: "transparent", color: "var(--ink-1)",
  fontSize: 13, fontFamily: "inherit", outline: "none",
};

// Select with chevron
function FSelect({ value, onChange, style, children }: {
  value: string; onChange: (v: string) => void;
  style?: React.CSSProperties; children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...INPUT, appearance: "none", paddingRight: 28, cursor: "pointer", ...style }}>
        {children}
      </select>
      <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", pointerEvents: "none", display: "flex" }}>
        <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={1.5} />
      </span>
    </div>
  );
}

// Borderless select for top strip
function StripSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...STRIP_INPUT, appearance: "none", paddingRight: 20, cursor: "pointer" }}>
        {children}
      </select>
      <span style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", pointerEvents: "none", display: "flex" }}>
        <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={1.5} />
      </span>
    </div>
  );
}

// ── ConceptoInput — busqueda @ de productos ──────────────────────────────────
interface ProductResult {
  id: number; name: string; description?: string | null; unitPrice?: string | null;
  taxRate?: string | null; category?: string | null; color?: string | null;
  initials?: string | null; stock?: number | null; stockMin?: number | null;
}

function ConceptoInput({ value, onChange, onProductSelect }: {
  value: string;
  onChange: (v: string) => void;
  onProductSelect?: (p: ProductResult) => void;
}) {
  const [results, setResults] = useState<ProductResult[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [focus, setFocus] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShowDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleChange = async (v: string) => {
    onChange(v);
    const atIdx = v.lastIndexOf("@");
    if (atIdx !== -1) {
      const q = v.slice(atIdx + 1).toLowerCase().trim();
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          const hits: ProductResult[] = (data.data || []).slice(0, 8);
          setResults(hits);
          setShowDrop(hits.length > 0);
        }
      } catch { setShowDrop(false); }
    } else {
      setShowDrop(false);
      setResults([]);
    }
  };

  const handleSelect = (p: ProductResult) => {
    const atIdx = value.lastIndexOf("@");
    onChange(atIdx !== -1 ? value.slice(0, atIdx) + p.name : p.name);
    onProductSelect?.(p);
    setShowDrop(false);
    setResults([]);
  };

  const fmtPrice = (v?: string | null) => v ? parseFloat(v).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €" : "";

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
      <textarea
        value={value}
        placeholder="Concepto — usa @ para buscar producto"
        onChange={e => handleChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{ ...CELL_BASE, ...(focus ? { border: "1px solid var(--color-primary, #3970FF)", background: "var(--bg-panel)" } : {}), resize: "vertical", minHeight: 36, height: 36, lineHeight: 1.4, paddingTop: 7 }}
      />
      {showDrop && results.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", boxShadow: "0 10px 30px -8px rgba(24,20,10,0.15)", zIndex: 300, maxHeight: 240, overflowY: "auto" }}>
          {results.map(p => {
            const hasStock = p.stock != null;
            const lowStock = hasStock && p.stock! <= (p.stockMin || 0);
            const avail = hasStock
              ? lowStock
                ? { txt: `${p.stock} uds — stock bajo`, col: "#B55450", bg: "#FBEDEC" }
                : { txt: `${p.stock} disponibles`, col: "#1F6A3A", bg: "#EDF5EE" }
              : null;
            return (
              <div key={p.id}
                onMouseDown={() => handleSelect(p)}
                style={{ padding: "7px 10px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-subtle)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ width: 28, height: 28, borderRadius: 6, background: (p.color || "#aaa") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: p.color || "#666", flexShrink: 0 }}>
                  {p.initials || p.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{[p.category, p.unitPrice ? fmtPrice(p.unitPrice) : null].filter(Boolean).join(" · ")}</div>
                </div>
                {avail && (
                  <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: avail.bg, color: avail.col, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {avail.txt}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Cell input base style (transparent border, blue on focus)
const CELL_BASE: React.CSSProperties = {
  width: "100%", padding: "6px 8px", border: "1px solid transparent", borderRadius: "var(--r-xs)",
  background: "transparent", color: "var(--ink-1)", fontSize: 13, fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};

function CellInput({ value, onChange, type = "text", textAlign }: {
  value: string | number; onChange: (v: string) => void;
  type?: string; textAlign?: React.CSSProperties["textAlign"];
}) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        ...CELL_BASE,
        ...(focus ? { border: "1px solid var(--color-primary, #3970FF)", background: "var(--bg-panel)" } : {}),
        textAlign,
      }}
    />
  );
}

function CellTextArea({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        ...CELL_BASE,
        ...(focus ? { border: "1px solid var(--color-primary, #3970FF)", background: "var(--bg-panel)" } : {}),
        resize: "vertical", minHeight: 36, height: 36, lineHeight: 1.4, paddingTop: 7,
      }}
    />
  );
}

function VatPill({ vat, onChange, taxRates }: { vat: number; onChange: (v: number) => void; taxRates: TaxRate[] }) {
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

  const options = taxRates.length > 0
    ? taxRates.filter(t => t.isActive !== false).map(t => parseFloat(t.rate))
    : [21, 10, 4, 0];

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 8px", background: "var(--bg-subtle)",
          border: "1px solid var(--line-1)", borderRadius: 5,
          fontSize: 12, cursor: "pointer", color: "var(--ink-1)", whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: "var(--ink-3)", fontSize: 11 }}>×</span> IVA {vat}%
        <HugeiconsIcon icon={ArrowDown01Icon} size={10} strokeWidth={1.5} style={{ color: "var(--ink-3)" }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          background: "var(--bg-panel)", border: "1px solid var(--line-1)",
          borderRadius: "var(--r-md)", boxShadow: "var(--shadow-pop, 0 4px 16px rgba(0,0,0,.12))",
          zIndex: 200, overflow: "hidden", minWidth: 140, padding: 4,
        }}>
          {options.map(v => (
            <button
              key={v}
              onClick={() => { onChange(v); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "7px 12px",
                background: vat === v ? "var(--bg-subtle)" : "transparent",
                border: "none", cursor: "pointer", fontSize: 12.5,
                color: "var(--ink-1)", fontWeight: vat === v ? 600 : 400,
                borderRadius: "var(--r-sm)",
              }}
            >
              IVA {v}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentDrawer({
  open, onOpenChange, type, documentId, initialData, onSuccess,
  onDuplicate, onConvert, saveEndpoint, lockedEvent, lockedClientLabel,
  eventsEndpoint, vendorsEndpoint,
}: DocumentDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [documentNumber, setDocumentNumber] = useState<string | undefined>();
  const [documentStatus, setDocumentStatus] = useState<string | undefined>();
  const [showNotes, setShowNotes] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [accountingAccount, setAccountingAccount] = useState(FIN_ACCOUNTS[0]);
  const [perConcept, setPerConcept] = useState(false);
  const [tags, setTags] = useState("");
  const [perConceptTags, setPerConceptTags] = useState(false);

  const isDeliveryNote = type === "delivery_note";

  // Form state
  const [contactValue, setContactValue] = useState<ContactSelectorValue | null>(null);
  const [eventId, setEventId] = useState<string>("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [globalDiscountEnabled, setGlobalDiscountEnabled] = useState(false);
  const [cargoEnabled, setCargoEnabled] = useState(false);
  const [cargoAmt, setCargoAmt] = useState("");
  const [cargoType, setCargoType] = useState<"percentage" | "fixed">("percentage");
  const [discGlobal, setDiscGlobal] = useState(false);
  const [discGlobalAmt, setDiscGlobalAmt] = useState("");
  const [discGlobalType, setDiscGlobalType] = useState<"percentage" | "fixed">("percentage");
  const [items, setItems] = useState<DocumentItem[]>([
    { description: "", details: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 21, total: 0 },
  ]);

  // Reference data
  const [events, setEvents] = useState<Event[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);
  const [currency, setCurrency] = useState("EUR");
  const [enabledCurrencies, setEnabledCurrencies] = useState<string[]>(DEFAULT_ENABLED_CURRENCIES);
  const [orgData, setOrgData] = useState<OrganizationPreviewData | undefined>();
  const [preloadedVendors, setPreloadedVendors] = useState<Array<{ id: number; type: "vendor"; name: string; email: string | null; category?: string | null }> | undefined>();

  useEffect(() => {
    if (!open) return;
    fetchReferenceData();
    if (lockedEvent) setEventId(lockedEvent.id.toString());
    if (documentId) { fetchDocument(); }
    else if (initialData) {
      if (initialData.contactId) setContactValue({ type: "contact", id: initialData.contactId });
      else if (initialData.vendorId) setContactValue({ type: "vendor", id: initialData.vendorId });
      if (!lockedEvent) setEventId(initialData.eventId?.toString() || "");
      setNotes(initialData.notes || "");
      setTermsAndConditions(initialData.termsAndConditions || "");
      if (initialData.paymentMethod) setPaymentMethod(initialData.paymentMethod);
      if (initialData.bankAccountId) setBankAccountId(initialData.bankAccountId.toString());
      if (initialData.globalDiscount && initialData.globalDiscount > 0) {
        setGlobalDiscountEnabled(true);
        setDiscGlobal(true);
        setDiscGlobalAmt(initialData.globalDiscount.toString());
        setDiscGlobalType((initialData.globalDiscountType as "percentage" | "fixed") || "percentage");
      }
      if (initialData.items?.length) setItems(initialData.items);
    } else {
      resetForm();
      if (lockedEvent) setEventId(lockedEvent.id.toString());
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, documentId]);

  function resetForm() {
    setContactValue(null); setEventId(""); setDueDate(""); setValidUntil("");
    setNotes(""); setTermsAndConditions(""); setPaymentMethod(""); setPaymentNotes("");
    setBankAccountId(""); setGlobalDiscountEnabled(false); setCargoEnabled(false); setCargoAmt(""); setCargoType("percentage"); setDiscGlobal(false); setDiscGlobalAmt(""); setDiscGlobalType("percentage"); setDocumentNumber(undefined); setDocumentStatus(undefined);
    setIssueDate(new Date().toISOString().split("T")[0]);
    setAccountingAccount(FIN_ACCOUNTS[0]); setPerConcept(false); setTags(""); setPerConceptTags(false);
    setItems([{ description: "", details: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: defaultTaxRate, total: 0 }]);
  }

  async function fetchReferenceData() {
    try {
      const [eventsRes, taxRatesRes, settingsRes, bankAccountsRes] = await Promise.all([
        lockedEvent ? Promise.resolve(null) : fetch(eventsEndpoint || "/api/events?scope=accessible"),
        fetch("/api/finance/tax-rates"),
        fetch("/api/finance/settings"),
        fetch("/api/finance/bank-accounts"),
      ]);
      if (eventsRes?.ok) { const d = await (eventsRes as Response).json(); setEvents(d.data || []); }
      if (taxRatesRes.ok) {
        const d = await taxRatesRes.json(); setTaxRates(d.data || []);
        const def = d.data?.find((t: TaxRate) => t.isDefault);
        if (def) setDefaultTaxRate(parseFloat(def.rate));
      }
      if (bankAccountsRes.ok) { const d = await bankAccountsRes.json(); setBankAccounts(d.data || []); }
      if (settingsRes.ok) {
        const d = await settingsRes.json();
        if (d.data?.defaultTermsAndConditions && !documentId && !initialData) setTermsAndConditions(d.data.defaultTermsAndConditions);
        if (d.data?.quoteValidityDays && type === "quote" && !documentId && !initialData) {
          const dt = new Date(); dt.setDate(dt.getDate() + d.data.quoteValidityDays);
          setValidUntil(dt.toISOString().split("T")[0]);
        }
        if (!documentId && !initialData) {
          if (d.data?.defaultPaymentMethod) setPaymentMethod(d.data.defaultPaymentMethod);
          if (d.data?.defaultBankAccountId) setBankAccountId(d.data.defaultBankAccountId.toString());
        }
        if (d.data?.defaultCurrency && !documentId) setCurrency(d.data.defaultCurrency);
        if (d.data?.enabledCurrencies && Array.isArray(d.data.enabledCurrencies)) setEnabledCurrencies(d.data.enabledCurrencies);
      }
      if (vendorsEndpoint) {
        try {
          const vr = await fetch(vendorsEndpoint);
          if (vr.ok) { const vd = await vr.json(); setPreloadedVendors((vd.data || []).map((v: any) => ({ id: v.id, type: "vendor" as const, name: v.name, email: v.email || null, category: v.category || null }))); }
        } catch {}
      }
      const pr = await fetch("/api/user/profile");
      if (pr.ok) {
        const pd = await pr.json(); const org = pd.data?.organization;
        if (org) setOrgData({ name: org.fiscalName || org.name, taxId: org.taxId || undefined, fiscalAddress: org.fiscalAddress || undefined, fiscalCity: org.fiscalCity || undefined, fiscalPostalCode: org.fiscalPostalCode || undefined, fiscalCountry: org.fiscalCountry || undefined, fiscalEmail: org.fiscalEmail || undefined, fiscalPhone: org.fiscalPhone || undefined, invoiceLogo: org.invoiceLogo || org.logo || undefined });
      }
    } catch (err) { console.error("fetchReferenceData:", err); }
  }

  async function fetchDocument() {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/documents/${documentId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const doc = data.data;
          if (doc.contactId) setContactValue({ type: "contact", id: doc.contactId, name: doc.contactName || undefined, email: doc.contactEmail || undefined, phone: doc.contactPhone || undefined, address: doc.contactAddress || undefined, taxId: doc.contactTaxId || undefined });
          else if (doc.vendorId) setContactValue({ type: "vendor", id: doc.vendorId, name: doc.vendorName || undefined, email: doc.vendorEmail || undefined, phone: doc.vendorPhone || undefined, address: doc.vendorAddress || undefined });
          setDocumentNumber(doc.number || undefined); setDocumentStatus(doc.status || undefined);
          if (doc.currency) setCurrency(doc.currency);
          setEventId(doc.eventId?.toString() || "");
          setDueDate(doc.dueDate ? doc.dueDate.split("T")[0] : "");
          setValidUntil(doc.validUntil ? doc.validUntil.split("T")[0] : "");
          setNotes(doc.notes || ""); setTermsAndConditions(doc.termsAndConditions || "");
          setPaymentMethod(doc.paymentMethod || ""); setBankAccountId(doc.bankAccountId?.toString() || "");
          const gd = parseFloat(doc.globalDiscount || "0");
          const gs = parseFloat(doc.globalSurcharge || "0");
          if (gd > 0 || gs > 0) {
            setGlobalDiscountEnabled(true);
            if (gd > 0) { setDiscGlobal(true); setDiscGlobalAmt(gd.toString()); setDiscGlobalType((doc.globalDiscountType as "percentage" | "fixed") || "percentage"); }
            if (gs > 0) { setCargoEnabled(true); setCargoAmt(gs.toString()); setCargoType((doc.globalSurchargeType as "percentage" | "fixed") || "percentage"); }
          }
          if (doc.items?.length > 0) setItems(doc.items.map((it: any) => ({ id: it.id, description: it.description, details: it.details || "", quantity: parseFloat(it.quantity), unitPrice: parseFloat(it.unitPrice), discount: parseFloat(it.discount || "0"), taxRate: parseFloat(it.taxRate ?? "21"), total: parseFloat(it.total) })));
        }
      }
    } catch (err) { toast.error("Error al cargar el documento"); }
    finally { setLoading(false); }
  }

  function addItem() {
    setItems([...items, { description: "", details: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: defaultTaxRate, total: 0 }]);
  }
  function removeItem(i: number) { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof DocumentItem, value: string | number) {
    const next = [...items];
    const item = { ...next[i] };
    if (field === "description" || field === "details") { (item as any)[field] = value as string; }
    else { (item as any)[field] = parseFloat(value as string) || 0; }
    const sub = item.quantity * item.unitPrice;
    item.total = sub - sub * (item.discount / 100);
    next[i] = item; setItems(next);
  }

  function resolveAmt(enabled: boolean, amt: string, type: "percentage" | "fixed", base: number) {
    if (!enabled) return 0;
    const v = Number(amt) || 0;
    return type === "percentage" ? base * (v / 100) : v;
  }

  function convertAmt(val: string, from: "percentage" | "fixed", to: "percentage" | "fixed", base: number): string {
    if (from === to) return val;
    const v = Number(val) || 0;
    if (to === "fixed") return base > 0 ? String(parseFloat((base * v / 100).toFixed(2))) : val;
    return base > 0 ? String(parseFloat((v / base * 100).toFixed(4))) : val;
  }

  function handleCargoTypeChange(newType: "percentage" | "fixed") {
    const sub = items.reduce((s, it) => s + it.total, 0);
    setCargoAmt(convertAmt(cargoAmt, cargoType, newType, sub));
    setCargoType(newType);
  }

  function handleDiscTypeChange(newType: "percentage" | "fixed") {
    const sub = items.reduce((s, it) => s + it.total, 0);
    setDiscGlobalAmt(convertAmt(discGlobalAmt, discGlobalType, newType, sub));
    setDiscGlobalType(newType);
  }

  function calculateTotals() {
    let sub = 0, tax = 0;
    items.forEach(it => { sub += it.total; });
    let disc = 0, cargo = 0;
    if (globalDiscountEnabled) {
      disc = resolveAmt(discGlobal, discGlobalAmt, discGlobalType, sub);
      cargo = resolveAmt(cargoEnabled, cargoAmt, cargoType, sub);
    }
    const afterAdj = Math.max(0, sub - disc + cargo);
    items.forEach(it => { const prop = sub > 0 ? it.total / sub : 0; tax += afterAdj * prop * (it.taxRate / 100); });
    return { sub, disc, cargo, afterAdj, tax, total: afterAdj + tax };
  }

  async function handleSubmit() {
    if (!items.some(it => it.description.trim())) { toast.error("Agrega al menos un ítem con descripción"); return; }
    setSaving(true);
    try {
      const direction = contactValue?.type === "vendor" ? "incoming" : "outgoing";
      const payload = {
        type,
        contactId: contactValue?.type === "contact" ? contactValue.id : undefined,
        vendorId: contactValue?.type === "vendor" ? contactValue.id : undefined,
        eventId: eventId ? parseInt(eventId) : undefined,
        dueDate: dueDate || undefined, validUntil: validUntil || undefined,
        notes: notes || undefined, termsAndConditions: termsAndConditions || undefined,
        paymentMethod: paymentMethod || undefined, bankAccountId: bankAccountId ? parseInt(bankAccountId) : undefined,
        globalDiscount: globalDiscountEnabled && discGlobal ? (Number(discGlobalAmt) || 0) : 0,
        globalDiscountType: discGlobalType,
        globalSurcharge: globalDiscountEnabled && cargoEnabled ? (Number(cargoAmt) || 0) : 0,
        globalSurchargeType: cargoType,
        direction, currency, status: documentId ? undefined : "sent",
        items: items.filter(it => it.description.trim()).map(it => ({
          description: it.description, details: it.details || undefined, quantity: it.quantity,
          unitPrice: isDeliveryNote ? 0 : it.unitPrice,
          discount: isDeliveryNote ? 0 : it.discount,
          taxRate: isDeliveryNote ? 0 : it.taxRate,
        })),
      };
      const url = documentId ? `/api/finance/documents/${documentId}` : (saveEndpoint || "/api/finance/documents");
      const res = await fetch(url, { method: documentId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { toast.success(documentId ? "Documento actualizado" : `${typeLabels[type]} guardado`); onOpenChange(false); onSuccess?.(); }
      else { const err = await res.json(); toast.error(err.error?.message || "Error al guardar"); }
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  const totals = calculateTotals();
  const fmt = (n: number) => fmtMoney(n, currency || "EUR");
  const dash = (n: number) => n === 0 ? "—" : fmt(n);
  const selectedBank = bankAccounts.find(b => b.id.toString() === bankAccountId);

  const previewData = useMemo(() => {
    const selectedEvent = events.find(e => e.id.toString() === eventId);
    return {
      type, contactName: contactValue?.type === "contact" ? contactValue.name : undefined,
      vendorName: contactValue?.type === "vendor" ? contactValue.name : undefined,
      contactEmail: contactValue?.email || undefined, contactPhone: contactValue?.phone || undefined,
      contactAddress: contactValue?.address || undefined, contactTaxId: contactValue?.taxId || undefined,
      eventName: selectedEvent?.name, documentNumber, documentId: documentId || undefined, status: documentStatus,
      items, notes, termsAndConditions, dueDate, validUntil, organization: orgData,
      globalDiscount: globalDiscountEnabled && discGlobal ? (Number(discGlobalAmt) || 0) : 0,
      globalDiscountType: discGlobalType,
      globalDiscountEnabled,
      globalSurcharge: globalDiscountEnabled && cargoEnabled ? (Number(cargoAmt) || 0) : 0,
      globalSurchargeType: cargoType,
      paymentMethod: paymentMethod || undefined, currency,
    };
  }, [type, contactValue, eventId, items, notes, termsAndConditions, dueDate, validUntil, events, orgData, documentNumber, documentId, documentStatus, globalDiscountEnabled, discGlobal, discGlobalAmt, discGlobalType, cargoEnabled, cargoAmt, cargoType, paymentMethod, currency]);

  if (!open) return null;

  const dateLabel = type === "quote" ? "Válido hasta" : "Vencimiento";
  const dateValue = type === "quote" ? validUntil : dueDate;
  const setDateValue = type === "quote" ? setValidUntil : setDueDate;

  // Lines table grid template
  const linesGrid = isDeliveryNote
    ? "20px 2fr 1.5fr 0.6fr 28px"
    : "20px 2fr 1.5fr 0.6fr 0.7fr 0.5fr 1fr 0.85fr 28px";

  const colHdr: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--ink-3)",
    padding: "10px 10px",
    borderBottom: "1px solid var(--line-1)", background: "var(--bg-subtle)",
    display: "flex", alignItems: "center",
  };

  return (
    <>
    <div
      onClick={() => onOpenChange(false)}
      style={{ position: "fixed", inset: 0, background: "rgba(30,25,20,0.28)", display: "flex", justifyContent: "flex-end", zIndex: 50, backdropFilter: "blur(2px)" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: "min(1320px, 100vw)", height: "100%", background: "var(--bg-panel)", borderLeft: "1px solid var(--line-1)", boxShadow: "-20px 0 40px -10px rgba(0,0,0,.15)", display: "flex", flexDirection: "column" }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid var(--line-1)", flexShrink: 0, gap: 12 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink-1)", margin: 0, letterSpacing: "-0.01em", flex: 1 }}>
            {documentId ? `Editar ${typeLabels[type].toLowerCase()}` : `Nuevo ${typeLabels[type].toLowerCase()}`}
          </h2>

          {/* Convert / Duplicate (edit mode) */}
          {documentId && (onDuplicate || onConvert) && (
            <div style={{ display: "flex", gap: 6 }}>
              {onDuplicate && (
                <button onClick={async () => { if (await appConfirm({ title: "Duplicar documento", description: "Se creará una copia exacta de este documento.", confirmLabel: "Duplicar" })) onDuplicate!(); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", fontSize: 12, fontWeight: 500, background: "none", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", color: "var(--ink-2)", cursor: "pointer" }}>
                  <HugeiconsIcon icon={Copy01Icon} size={12} strokeWidth={1.5} /> Duplicar
                </button>
              )}
              {onConvert && type !== "invoice" && type !== "credit_note" && (
                <button onClick={async () => { if (await appConfirm({ title: "Convertir a factura", description: "Se creará una nueva factura a partir de este documento.", confirmLabel: "Convertir" })) onConvert!("invoice"); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", fontSize: 12, fontWeight: 500, background: "none", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", color: "var(--ink-2)", cursor: "pointer" }}>
                  <HugeiconsIcon icon={Exchange01Icon} size={12} strokeWidth={1.5} /> Convertir a Factura
                </button>
              )}
              {onConvert && type !== "delivery_note" && (
                <button onClick={async () => { if (await appConfirm({ title: "Convertir a albarán", description: "Se creará un nuevo albarán a partir de este documento.", confirmLabel: "Convertir" })) onConvert!("delivery_note"); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", fontSize: 12, fontWeight: 500, background: "none", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", color: "var(--ink-2)", cursor: "pointer" }}>
                  <HugeiconsIcon icon={TruckIcon} size={12} strokeWidth={1.5} /> Convertir a Albarán
                </button>
              )}
            </div>
          )}

          {/* Vista previa button */}
          <button onClick={() => setShowPreview(v => !v)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 500, color: showPreview ? "var(--ink-1)" : "var(--ink-2)", cursor: "pointer", background: showPreview ? "var(--bg-soft)" : "transparent" }}>
            <HugeiconsIcon icon={EyeIcon} size={14} strokeWidth={1.5} />
            Vista previa
          </button>

          <button onClick={() => onOpenChange(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 6, display: "flex" }}>
            <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Cargando...</span>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* Main form */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

              {/* ── Top fields strip ─────────────────────────────── */}
              <div style={{ display: "grid", gridTemplateColumns: linesGrid, borderBottom: "1px solid var(--line-1)", flexShrink: 0, background: "var(--bg-panel)" }}>
                {/* Contacto — span 2 (drag handle + concepto) */}
                <div style={{ gridColumn: "span 2", padding: "10px 16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-3)", marginBottom: 6 }}>Contacto</div>
                  {lockedClientLabel ? (
                    <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{lockedClientLabel}</div>
                  ) : (
                    <ContactSelector value={contactValue} onChange={setContactValue} vendors={preloadedVendors} stripMode />
                  )}
                </div>

                {/* Evento — span 1 (descripción) */}
                <div style={{ gridColumn: "span 1", padding: "10px 16px", borderLeft: "1px solid var(--line-1)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-3)", marginBottom: 6 }}>Evento</div>
                  {lockedEvent ? (
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>{lockedEvent.name}</div>
                  ) : (
                    <StripSelect value={eventId} onChange={setEventId}>
                      <option value="">Sin evento</option>
                      {events.map(ev => <option key={ev.id} value={ev.id.toString()}>{ev.name}</option>)}
                    </StripSelect>
                  )}
                </div>

                {/* Número de documento — span 2 (cantidad + precio) for invoice; span 1 for delivery */}
                <div style={{ gridColumn: isDeliveryNote ? "span 1" : "span 2", padding: "10px 16px", borderLeft: "1px solid var(--line-1)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-3)", marginBottom: 6 }}>Número de documento</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>{documentNumber || "Autogenerado"}</div>
                </div>

                {/* Fecha — span 2 (dto + impuestos) for invoice; span 1 for delivery */}
                <div style={{ gridColumn: isDeliveryNote ? "span 1" : "span 2", padding: "10px 16px", borderLeft: "1px solid var(--line-1)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-3)", marginBottom: 6 }}>Fecha</div>
                  <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} style={STRIP_INPUT} />
                </div>

                {/* Vencimiento/Válido hasta — span 2 (total + delete) for invoice only */}
                {!isDeliveryNote && (
                  <div style={{ gridColumn: "span 2", padding: "10px 16px", borderLeft: "1px solid var(--line-1)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-3)", marginBottom: 6 }}>{dateLabel}</div>
                    <input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)} style={STRIP_INPUT} />
                  </div>
                )}
              </div>

              {/* ── Lines table ──────────────────────────────────── */}
              <div style={{ flexShrink: 0 }}>
                {/* Lines header */}
                <div style={{ display: "grid", gridTemplateColumns: linesGrid }}>
                  <div style={colHdr} />
                  <div style={colHdr}>Concepto</div>
                  <div style={colHdr}>Descripción</div>
                  <div style={colHdr}>Cantidad</div>
                  {!isDeliveryNote && (
                    <>
                      <div style={colHdr}>Precio</div>
                      <div style={colHdr}>Dto. %</div>
                      <div style={colHdr}>Impuestos</div>
                      <div style={{ ...colHdr, justifyContent: "flex-end" }}>Total</div>
                    </>
                  )}
                  <div style={colHdr} />
                </div>

                {/* Line rows */}
                {items.map((item, idx) => {
                  const [handleVisible, setHandleVisible] = [false, () => {}]; // placeholder, managed via onMouseEnter/Leave
                  return (
                  <div
                    key={idx}
                    style={{ display: "grid", gridTemplateColumns: linesGrid, borderBottom: "1px solid var(--line-1)", alignItems: "stretch", minHeight: 44 }}
                    onMouseEnter={e => { const h = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(".drag-handle"); if (h) h.style.opacity = "1"; }}
                    onMouseLeave={e => { const h = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(".drag-handle"); if (h) h.style.opacity = "0"; }}
                  >
                    {/* Drag handle */}
                    <div className="drag-handle" style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .12s", cursor: "grab", color: "var(--ink-4)" }}>
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                        <circle cx="3" cy="3" r="1.2" fill="currentColor" /><circle cx="7" cy="3" r="1.2" fill="currentColor" />
                        <circle cx="3" cy="7" r="1.2" fill="currentColor" /><circle cx="7" cy="7" r="1.2" fill="currentColor" />
                        <circle cx="3" cy="11" r="1.2" fill="currentColor" /><circle cx="7" cy="11" r="1.2" fill="currentColor" />
                      </svg>
                    </div>

                    {/* Concepto */}
                    <div style={{ display: "flex", alignItems: "flex-start", padding: "4px 6px", borderLeft: "1px solid var(--line-1)" }}>
                      <ConceptoInput
                        value={item.description}
                        onChange={v => updateItem(idx, "description", v)}
                        onProductSelect={p => {
                          const next = [...items];
                          next[idx] = {
                            ...next[idx],
                            description: p.name,
                            details: p.description || next[idx].details,
                            unitPrice: p.unitPrice ? parseFloat(p.unitPrice) : next[idx].unitPrice,
                            taxRate: p.taxRate ? parseFloat(p.taxRate) : next[idx].taxRate,
                          };
                          const base = next[idx].quantity * next[idx].unitPrice;
                          next[idx].total = base * (1 - next[idx].discount / 100);
                          setItems(next);
                        }}
                      />
                    </div>

                    {/* Descripción */}
                    <div style={{ display: "flex", alignItems: "flex-start", padding: "4px 6px", borderLeft: "1px solid var(--line-1)" }}>
                      <CellTextArea
                        placeholder="Descripción"
                        value={item.details || ""}
                        onChange={v => updateItem(idx, "details", v)}
                      />
                    </div>

                    {/* Cantidad */}
                    <div style={{ display: "flex", alignItems: "center", padding: "4px 6px", borderLeft: "1px solid var(--line-1)" }}>
                      <CellInput type="number" value={item.quantity} onChange={v => updateItem(idx, "quantity", v)} textAlign="center" />
                    </div>

                    {!isDeliveryNote && (
                      <>
                        {/* Precio */}
                        <div style={{ display: "flex", alignItems: "center", padding: "4px 6px", borderLeft: "1px solid var(--line-1)" }}>
                          <CellInput type="number" value={item.unitPrice} onChange={v => updateItem(idx, "unitPrice", v)} textAlign="right" />
                        </div>

                        {/* Dto.% */}
                        <div style={{ display: "flex", alignItems: "center", padding: "4px 6px", borderLeft: "1px solid var(--line-1)" }}>
                          <CellInput type="number" value={item.discount} onChange={v => updateItem(idx, "discount", v)} textAlign="center" />
                        </div>

                        {/* Impuestos — VatPill */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 6px", borderLeft: "1px solid var(--line-1)" }}>
                          <VatPill vat={item.taxRate} onChange={v => updateItem(idx, "taxRate", v)} taxRates={taxRates} />
                        </div>

                        {/* Total (con IVA incluido) */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "4px 10px", borderLeft: "1px solid var(--line-1)", fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>
                          {dash(item.total + item.total * (item.taxRate / 100))}
                        </div>
                      </>
                    )}

                    {/* Delete */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid var(--line-1)" }}>
                      <button onClick={() => removeItem(idx)} disabled={items.length === 1}
                        style={{ background: "none", border: "none", cursor: items.length === 1 ? "not-allowed" : "pointer", color: items.length === 1 ? "var(--line-1)" : "#C0392B", padding: 4, display: "flex", borderRadius: 4 }}>
                        <HugeiconsIcon icon={Delete01Icon} size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                  );
                })}

                {/* Add line + Add discount + Totals row */}
                <div style={{ display: "flex", alignItems: "flex-start", padding: "12px 16px", borderBottom: "1px solid var(--line-1)", gap: 16 }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                    <button onClick={addItem}
                      style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500, background: "none", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", color: "var(--ink-1)", cursor: "pointer" }}>
                      <HugeiconsIcon icon={PlusSignIcon} size={13} strokeWidth={1.5} />
                      Añadir línea
                    </button>

                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-2)", cursor: "pointer" }}>
                      <input type="checkbox" checked={showNotes} onChange={e => setShowNotes(e.target.checked)}
                        style={{ width: 14, height: 14, cursor: "pointer", accentColor: "var(--ink-1)" }} />
                      Añadir texto en el documento
                    </label>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-2)", cursor: "pointer" }}>
                      <input type="checkbox" checked={showTerms} onChange={e => setShowTerms(e.target.checked)}
                        style={{ width: 14, height: 14, cursor: "pointer", accentColor: "var(--ink-1)" }} />
                      Añadir mensaje al final
                    </label>
                  </div>

                  {/* Totals */}
                  {!isDeliveryNote && (
                    <div style={{ minWidth: 300, flexShrink: 0 }}>
                      {!globalDiscountEnabled && (
                        <div style={{ textAlign: "right", marginBottom: 10 }}>
                          <button onClick={() => setGlobalDiscountEnabled(true)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary, #2563EB)", fontSize: 12.5, fontWeight: 500, padding: 0 }}>
                            + Añadir descuento
                          </button>
                        </div>
                      )}
                      {globalDiscountEnabled && (
                        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", padding: "10px 14px", marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", marginBottom: 6 }}>
                            <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>Subtotal sin descuento</span>
                            <span style={{ fontWeight: 500 }}>{fmt(totals.sub)}</span>
                          </div>
                          {[
                            { label: "Cargo global", checked: cargoEnabled, setChecked: setCargoEnabled, amt: cargoAmt, setAmt: setCargoAmt, dtype: cargoType, onTypeChange: handleCargoTypeChange },
                            { label: "Descuento global", checked: discGlobal, setChecked: setDiscGlobal, amt: discGlobalAmt, setAmt: setDiscGlobalAmt, dtype: discGlobalType, onTypeChange: handleDiscTypeChange },
                          ].map(({ label, checked, setChecked, amt, setAmt, dtype, onTypeChange }) => (
                            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13, padding: "4px 0" }}>
                              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
                                  style={{ accentColor: "var(--color-primary, #2563EB)", width: 14, height: 14, cursor: "pointer" }} />
                                {label}
                              </label>
                              <div style={{ display: "flex", alignItems: "center", gap: 4, opacity: checked ? 1 : 0.4 }}>
                                <input type="number" min="0" step="0.01" value={amt}
                                  onChange={e => setAmt(e.target.value)} placeholder="0" disabled={!checked}
                                  style={{ width: 60, border: "1px solid var(--line-1)", borderRadius: "var(--r-xs)", padding: "3px 7px", fontSize: 12.5, background: checked ? "var(--bg-panel)" : "var(--bg-subtle)", color: "var(--ink-1)", fontFamily: "inherit", outline: "none", textAlign: "right" }} />
                                <div style={{ display: "flex", border: "1px solid var(--line-1)", borderRadius: "var(--r-xs)", overflow: "hidden", flexShrink: 0 }}>
                                  {(["percentage", "fixed"] as const).map(t => (
                                    <button key={t} disabled={!checked} onClick={() => onTypeChange(t)}
                                      style={{ padding: "3px 7px", fontSize: 11.5, fontWeight: 500, border: "none", cursor: checked ? "pointer" : "default", background: dtype === t ? "var(--color-primary, #2563EB)" : "transparent", color: dtype === t ? "#fff" : "var(--ink-2)", transition: "background 0.1s" }}>
                                      {t === "percentage" ? "%" : "€"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div style={{ textAlign: "right", marginTop: 6 }}>
                            <button onClick={() => { setGlobalDiscountEnabled(false); setCargoEnabled(false); setCargoAmt(""); setCargoType("percentage"); setDiscGlobal(false); setDiscGlobalAmt(""); setDiscGlobalType("percentage"); }}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 11.5, padding: 0 }}>
                              Quitar descuento
                            </button>
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                        <span style={{ color: "var(--ink-3)" }}>Subtotal</span>
                        <span style={{ fontWeight: 500 }}>{fmt(totals.sub)}</span>
                      </div>
                      {totals.disc > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                          <span style={{ color: "#4A8C4A" }}>Descuento</span>
                          <span style={{ color: "#4A8C4A", fontWeight: 500 }}>-{fmt(totals.disc)}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                        <span style={{ color: "var(--ink-3)" }}>IVA</span>
                        <span style={{ fontWeight: 500 }}>{fmt(totals.tax)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, padding: "10px 0 4px", borderTop: "1px solid var(--line-1)", marginTop: 6 }}>
                        <span>Total</span>
                        <span>{fmt(totals.total)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes / Terms (shown via checkbox) */}
                {(showNotes || showTerms) && (
                  <div style={{ padding: "16px 16px 0", display: "grid", gridTemplateColumns: showNotes && showTerms ? "1fr 1fr" : "1fr", gap: 16 }}>
                    {showNotes && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-3)", marginBottom: 6 }}>Notas</div>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionales..." rows={3}
                          style={{ ...INPUT, resize: "vertical", padding: "10px 12px", fontFamily: "inherit" }} />
                      </div>
                    )}
                    {showTerms && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-3)", marginBottom: 6 }}>Términos y condiciones</div>
                        <textarea value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)} placeholder="Términos y condiciones..." rows={3}
                          style={{ ...INPUT, resize: "vertical", padding: "10px 12px", fontFamily: "inherit" }} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Bottom sections ──────────────────────────────── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid var(--line-1)", marginTop: 0, flex: 1 }}>
                {/* Método de pago */}
                <div style={{ padding: "20px 24px", borderRight: "1px solid var(--line-1)" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)", marginBottom: 14 }}>Método de pago</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>Selecciona una forma de pago</div>
                  <div style={{ marginBottom: 12 }}>
                    <FSelect value={paymentMethod} onChange={setPaymentMethod}>
                      <option value="">Sin especificar</option>
                      {paymentMethodOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </FSelect>
                  </div>

                  {paymentMethod === "bank_transfer" && bankAccounts.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <FSelect value={bankAccountId} onChange={v => {
                        setBankAccountId(v);
                        const acc = bankAccounts.find(b => b.id.toString() === v);
                        if (acc && !paymentNotes) setPaymentNotes(`${acc.bankName ? acc.bankName + " " : ""}${acc.iban || ""}`.trim());
                      }}>
                        <option value="">Sin cuenta especificada</option>
                        {bankAccounts.map(acc => <option key={acc.id} value={acc.id.toString()}>{acc.name}{acc.iban ? ` (${acc.iban.slice(-8)})` : ""}</option>)}
                      </FSelect>
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>Este texto aparecerá en el documento</div>
                  <textarea
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                    placeholder={selectedBank?.iban ? `Pagos por transferencia a: ${selectedBank.bankName || selectedBank.name} ${selectedBank.iban}` : "Información de pago..."}
                    rows={3}
                    style={{ ...INPUT, resize: "vertical", padding: "10px 12px", fontFamily: "inherit", fontSize: 13 }}
                  />
                  <button
                    onClick={() => {
                      if (selectedBank) setPaymentNotes(`Pagos por transferencia a: ${selectedBank.bankName || selectedBank.name} ${selectedBank.iban || ""}`.trim());
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary, #3970FF)", fontSize: 12.5, fontWeight: 500, padding: "8px 0 0", display: "block" }}
                  >
                    Editar forma de pago
                  </button>
                </div>

                {/* Categorización */}
                <div style={{ padding: "20px 24px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)", marginBottom: 14 }}>Categorización</div>

                  {/* Cuenta contable */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-3)", marginBottom: 6 }}>Cuenta contable</div>
                    <FSelect value={accountingAccount} onChange={setAccountingAccount}>
                      {FIN_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </FSelect>
                  </div>

                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-2)", cursor: "pointer", marginBottom: 12, userSelect: "none" }}>
                    <input type="checkbox" checked={perConcept} onChange={e => setPerConcept(e.target.checked)}
                      style={{ width: 14, height: 14, cursor: "pointer", accentColor: "var(--ink-1)" }} />
                    Cuenta por concepto
                  </label>

                  {/* Etiquetas */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-3)", marginBottom: 6 }}>Etiquetas</div>
                    <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags"
                      style={{ ...INPUT, padding: "8px 10px" }} />
                  </div>

                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-2)", cursor: "pointer", marginBottom: 12, userSelect: "none" }}>
                    <input type="checkbox" checked={perConceptTags} onChange={e => setPerConceptTags(e.target.checked)}
                      style={{ width: 14, height: 14, cursor: "pointer", accentColor: "var(--ink-1)" }} />
                    Etiquetas por concepto
                  </label>

                  {/* Nota interna */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-3)", marginBottom: 6 }}>Nota interna</div>
                    <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Nota interna"
                      style={{ ...INPUT, padding: "8px 10px" }} />
                  </div>

                  {/* No asignado */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--line-1)", fontSize: 12.5, marginBottom: 16 }}>
                    <span style={{ color: "var(--ink-3)" }}>No asignado</span>
                    <span style={{ fontWeight: 500 }}>{fmt(0)}</span>
                  </div>

                  {/* Moneda */}
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>Moneda</div>
                  <FSelect value={currency} onChange={setCurrency} style={{ maxWidth: 200 }}>
                    {CURRENCIES.filter(c => enabledCurrencies.includes(c.value) || c.value === currency).map(c => (
                      <option key={c.value} value={c.value}>{CURRENCY_SYMBOLS[c.value] || c.value} {c.value}</option>
                    ))}
                  </FSelect>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: "1px solid var(--line-1)", background: "var(--bg-panel)", flexShrink: 0 }}>
          <button onClick={() => onOpenChange(false)}
            style={{ padding: "9px 18px", fontSize: 13, fontWeight: 500, background: "none", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", color: "var(--ink-2)", cursor: "pointer" }}>
            Descartar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 20px", fontSize: 13, fontWeight: 600, background: "var(--primary, #3970FF)", border: "none", borderRadius: "var(--r-sm)", color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.5 8.5v2.5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V8.5" />
              <path d="M4.5 4.5l2.5 2.5 2.5-2.5" />
              <path d="M7 7V1.5" />
            </svg>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>

    {/* ── Preview popup (A4 modal) ───────────────────────────────── */}
    {showPreview && (
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(2px)", padding: "24px" }}
        onClick={() => setShowPreview(false)}
      >
        {/* Popup modal */}
        <div
          onClick={e => e.stopPropagation()}
          style={{ background: "var(--bg-base, #f9f8f6)", borderRadius: 12, width: "min(860px, 100%)", height: "min(92vh, 900px)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}
        >
          {/* Header bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid var(--line-1, #e5e3de)", flexShrink: 0, background: "var(--bg-panel, #fff)" }}>
            <span style={{ fontSize: 12, color: "var(--ink-3, #888)", fontWeight: 500 }}>Vista previa · Formato A4</span>
            <button onClick={() => setShowPreview(false)} style={{ background: "var(--bg-hover, #f0ede8)", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-2, #555)" }}>
              <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={1.5} />
            </button>
          </div>
          {/* Paginated preview */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <LiveDocumentPreview data={previewData} />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
