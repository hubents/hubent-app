"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { formatIban, cleanIban, validateIban, lookupIban } from "@/lib/iban-utils";
import { appConfirm } from "@/lib/confirm";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Btn, Inp, Pill } from "@/components/ui/ds";
import { useUserSession } from "@/hooks/use-user-session";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  RiSaveLine,
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiExternalLinkLine,
  RiInformationLine,
  RiBankCardLine,
} from "@remixicon/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";

interface FinanceSettings {
  id?: number;
  organizationId: number;
  defaultCurrency: string;
  enabledCurrencies: string[];
  quotePrefix: string;
  invoicePrefix: string;
  proformaPrefix: string;
  deliveryNotePrefix: string;
  creditNotePrefix: string;
  nextQuoteNumber: number;
  nextInvoiceNumber: number;
  nextProformaNumber: number;
  nextDeliveryNoteNumber: number;
  nextCreditNoteNumber: number;
  stripeAccountId: string | null;
  stripeEnabled: boolean;
  enableCash: boolean;
  enableBankTransfer: boolean;
  enableStripe: boolean;
  defaultPaymentTerms: string;
  defaultTermsAndConditions: string | null;
  quoteValidityDays: number;
  companyName: string | null;
  taxId: string | null;
  fiscalAddress: string | null;
  fiscalCity: string | null;
  fiscalPostalCode: string | null;
  fiscalCountry: string | null;
  fiscalEmail: string | null;
  fiscalPhone: string | null;
}

interface TaxRate {
  id: number;
  name: string;
  rate: string;
  isDefault: boolean;
  isActive: boolean;
}

interface BankAccount {
  id: number;
  name: string;
  bankName: string | null;
  iban: string | null;
  swift: string | null;
  isDefault: boolean;
  isActive: boolean;
}

const CURRENCIES = [
  { code: "EUR", name: "Euro" },
  { code: "USD", name: "Dólar estadounidense" },
  { code: "GBP", name: "Libra esterlina" },
  { code: "MXN", name: "Peso mexicano" },
  { code: "ARS", name: "Peso argentino" },
  { code: "CLP", name: "Peso chileno" },
  { code: "COP", name: "Peso colombiano" },
  { code: "PEN", name: "Sol peruano" },
];

type SettingsTab = "empresa" | "documentos" | "cobros";
const SETTINGS_TABS: { id: SettingsTab; label: string; hint: string }[] = [
  { id: "empresa", label: "Empresa", hint: "Datos fiscales y generales" },
  { id: "documentos", label: "Documentos", hint: "Impuestos, numeración y términos" },
  { id: "cobros", label: "Cobros", hint: "Cuentas y métodos de pago" },
];

// Field/row primitives matching the prototype's `FSField`/`FSRow`/`fsInputStyle` (finance.jsx:1597-1617).
const fsInputStyle: React.CSSProperties = {
  background: "var(--bg-panel)",
  border: "1px solid var(--line-strong)",
  borderRadius: "var(--r-sm)",
  padding: "10px 12px",
  fontSize: 13,
  color: "var(--ink-1)",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

function FSRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
      {children}
    </div>
  );
}

function FSField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{hint}</div>}
    </div>
  );
}

// Document-numbering table — replicates the prototype's `NumeracionTable` (finance.jsx:1717).
// Inputs always-on (no row-toggle edit mode) so the user can tweak any prefix/sequence in place.
function NumeracionTable({
  settings,
  setSettings,
}: {
  settings: FinanceSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<FinanceSettings | null>>;
}) {
  const year = new Date().getFullYear();
  // 4 rows matching the prototype exactly (finance.jsx:1718-1723):
  // Presupuestos · Facturas · Albaranes · Pagos. The schema doesn't have a
  // payment-numbering column yet, so the Pagos row is read-only / display-only
  // until we add `paymentPrefix` + `nextPaymentNumber` to the DB.
  const rows: Array<{
    label: string;
    prefixKey?: keyof FinanceSettings;
    nextKey?: keyof FinanceSettings;
    fallbackPrefix?: string;
    fallbackNext?: number;
  }> = [
    { label: "Presupuestos", prefixKey: "quotePrefix", nextKey: "nextQuoteNumber" },
    { label: "Facturas", prefixKey: "invoicePrefix", nextKey: "nextInvoiceNumber" },
    { label: "Albaranes", prefixKey: "deliveryNotePrefix", nextKey: "nextDeliveryNoteNumber" },
    { label: "Pagos", fallbackPrefix: "PAG-", fallbackNext: 1 },
  ];
  const cellInput: React.CSSProperties = {
    background: "white",
    border: "1px solid var(--line-1)",
    borderRadius: "var(--r-sm)",
    padding: "6px 10px",
    fontSize: 13,
    color: "var(--ink-1)",
    fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, monospace)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
  return (
    <div
      style={{
        width: "100%",
        borderCollapse: "collapse" as const,
        fontSize: 13,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 100px 100px 1fr",
          gap: 12,
          padding: "10px 12px",
          background: "var(--bg-subtle)",
          borderRadius: "var(--r-sm)",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: ".06em",
          textTransform: "uppercase",
        }}
      >
        <div>Documento</div>
        <div>Prefijo</div>
        <div>Siguiente Nº</div>
        <div>Formato</div>
      </div>
      {rows.map((r) => {
        const prefix = r.prefixKey
          ? ((settings?.[r.prefixKey] as string) || "")
          : (r.fallbackPrefix || "");
        const next = r.nextKey
          ? Number(settings?.[r.nextKey] || 1)
          : (r.fallbackNext || 1);
        const format = `${prefix}${year}-${String(next).padStart(4, "0")}`;
        const editable = Boolean(r.prefixKey && r.nextKey);
        return (
          <div
            key={r.label}
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 100px 100px 1fr",
              gap: 12,
              padding: "10px 12px",
              borderBottom: "1px solid var(--line-1)",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 500, color: "var(--ink-1)" }}>
              {r.label}
            </div>
            <input
              style={{ ...cellInput, opacity: editable ? 1 : 0.6 }}
              value={prefix}
              readOnly={!editable}
              onChange={(e) => {
                if (!r.prefixKey) return;
                const key = r.prefixKey;
                setSettings((s) =>
                  s ? { ...s, [key]: e.target.value } : s,
                );
              }}
            />
            <input
              type="number"
              style={{ ...cellInput, opacity: editable ? 1 : 0.6 }}
              value={next}
              readOnly={!editable}
              onChange={(e) => {
                if (!r.nextKey) return;
                const key = r.nextKey;
                setSettings((s) =>
                  s ? { ...s, [key]: parseInt(e.target.value, 10) || 1 } : s,
                );
              }}
            />
            <div
              style={{
                color: "var(--ink-3)",
                fontSize: 12.5,
                fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, monospace)",
              }}
            >
              {format}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Card primitive matching the prototype's `FSCard` (finance.jsx:1605).
// White panel, line-1 border, 20px padding, title 14/600 + ink-3 subtitle stacked,
// optional `action` slot on the right (used by Impuestos / Cuentas Bancarias).
function FSCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--line-1)",
        borderRadius: "var(--r-md)",
        padding: 20,
      }}
    >
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink-1)",
              marginBottom: 2,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {subtitle}
            </div>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
      {children}
    </div>
  );
}

export function FinanceSettingsContent({ basePath = "/dashboard/finance/settings" }: { basePath?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { can } = useUserSession();
  const canManageFinance = can("finance:manage");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<FinanceSettings | null>(null);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("empresa");
  
  // Tax rate dialog
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxRate | null>(null);
  const [newTaxName, setNewTaxName] = useState("");
  const [newTaxRate, setNewTaxRate] = useState("");
  const [newTaxDefault, setNewTaxDefault] = useState(false);

  // Bank account dialog
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [newBankName, setNewBankName] = useState("");
  const [newBankBankName, setNewBankBankName] = useState("");
  const [newBankIban, setNewBankIban] = useState("");
  const [newBankSwift, setNewBankSwift] = useState("");
  const [newBankDefault, setNewBankDefault] = useState(false);
  const [bankAutofillMsg, setBankAutofillMsg] = useState<string | null>(null);

  const handleBankIbanChange = (raw: string) => {
    setNewBankIban(formatIban(cleanIban(raw)));
    setBankAutofillMsg(null);
  };

  const handleBankIbanBlur = () => {
    const clean = cleanIban(newBankIban);
    if (clean.length < 8) return;
    const result = lookupIban(clean);
    const fills: string[] = [];
    if (result.bic && !newBankSwift.trim()) { setNewBankSwift(result.bic); fills.push("BIC"); }
    if (result.bankName && !newBankBankName.trim()) { setNewBankBankName(result.bankName); fills.push("Banco"); }
    if (fills.length > 0) {
      setBankAutofillMsg(`Rellenado: ${fills.join(" · ")}`);
      setTimeout(() => setBankAutofillMsg(null), 4000);
    }
  };

  // Check for Stripe callback messages
  useEffect(() => {
    const stripeSuccess = searchParams.get("stripe_success");
    const stripeError = searchParams.get("stripe_error");
    
    if (stripeSuccess === "true") {
      toast.success("¡Stripe conectado correctamente! Ya puedes recibir pagos con tarjeta.");
      // Clean URL
      router.replace(`${basePath}?tab=cobros`);
    } else if (stripeError) {
      // Map error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        "access_denied": "Cancelaste la conexión con Stripe",
        "state_expired": "La sesión expiró. Por favor, intenta de nuevo.",
        "stripe_not_configured": "Stripe no está configurado en el sistema. Contacta al administrador.",
        "token_exchange_failed": "Error al conectar con Stripe. Por favor, intenta de nuevo.",
        "no_account_id": "No se pudo obtener la cuenta de Stripe. Intenta de nuevo.",
        "internal_error": "Error interno. Por favor, intenta de nuevo.",
        "missing_params": "Parámetros faltantes. Por favor, intenta de nuevo.",
      };
      const message = errorMessages[stripeError] || `Error de Stripe: ${stripeError}`;
      toast.error(message);
      // Clean URL
      router.replace(`${basePath}?tab=cobros`);
    }
  }, [searchParams, router]);

  useEffect(() => {
    fetchData();
  }, []);

  // Detect if there are unsaved changes
  const hasChanges = useCallback(() => {
    if (!settings || !originalSettings) return false;
    
    const fieldsToCompare: (keyof FinanceSettings)[] = [
      "defaultCurrency",
      "quotePrefix",
      "invoicePrefix",
      "proformaPrefix",
      "deliveryNotePrefix",
      "creditNotePrefix",
      "nextQuoteNumber",
      "nextInvoiceNumber",
      "nextProformaNumber",
      "nextDeliveryNoteNumber",
      "nextCreditNoteNumber",
      "enableCash",
      "enableBankTransfer",
      "enableStripe",
      "defaultPaymentTerms",
      "defaultTermsAndConditions",
      "quoteValidityDays",
      "companyName",
      "taxId",
      "fiscalAddress",
      "fiscalCity",
      "fiscalPostalCode",
      "fiscalCountry",
      "fiscalEmail",
      "fiscalPhone",
    ];

    return fieldsToCompare.some(
      (field) => settings[field] !== originalSettings[field]
    );
  }, [settings, originalSettings]);

  const unsavedChanges = hasChanges();

  async function fetchData() {
    try {
      const [settingsRes, taxRes, bankRes] = await Promise.all([
        fetch("/api/finance/settings"),
        fetch("/api/finance/tax-rates"),
        fetch("/api/finance/bank-accounts"),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data.success) {
          setSettings(data.data);
          setOriginalSettings(data.data);
        }
      }

      if (taxRes.ok) {
        const data = await taxRes.json();
        if (data.success) setTaxRates(data.data || []);
      }

      if (bankRes.ok) {
        const data = await bankRes.json();
        if (data.success) setBankAccounts(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/finance/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success("Configuración guardada");
        // Update original settings to match saved state
        setOriginalSettings({ ...settings });
      } else {
        toast.error("Error al guardar");
      }
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function saveTaxRate() {
    if (!newTaxName || !newTaxRate) return;

    try {
      const res = await fetch("/api/finance/tax-rates", {
        method: editingTax ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTax?.id,
          name: newTaxName,
          rate: parseFloat(newTaxRate),
          isDefault: newTaxDefault,
        }),
      });

      if (res.ok) {
        toast.success(editingTax ? "Impuesto actualizado" : "Impuesto creado");
        setTaxDialogOpen(false);
        resetTaxForm();
        fetchData();
      } else {
        toast.error("Error al guardar impuesto");
      }
    } catch (error) {
      toast.error("Error al guardar impuesto");
    }
  }

  async function deleteTaxRate(id: number, isDefault: boolean) {
    const tax = taxRates.find((t) => t.id === id);
    const name = tax?.name || "este impuesto";
    const description = isDefault
      ? `"${name}" está marcado como impuesto por defecto.`
      : undefined;
    if (!await appConfirm({ title: `Eliminar ${name}`, description, confirmLabel: "Eliminar", variant: "destructive" })) return;
    try {
      const res = await fetch(`/api/finance/tax-rates?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Impuesto eliminado");
        fetchData();
      } else {
        toast.error("Error al eliminar");
      }
    } catch {
      toast.error("Error al eliminar");
    }
  }

  async function saveBankAccount() {
    if (!newBankName) return;

    try {
      const res = await fetch("/api/finance/bank-accounts", {
        method: editingBank ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBank?.id,
          name: newBankName,
          bankName: newBankBankName || null,
          iban: newBankIban || null,
          swift: newBankSwift || null,
          isDefault: newBankDefault,
        }),
      });

      if (res.ok) {
        toast.success(editingBank ? "Cuenta actualizada" : "Cuenta creada");
        setBankDialogOpen(false);
        resetBankForm();
        fetchData();
      } else {
        toast.error("Error al guardar cuenta");
      }
    } catch (error) {
      toast.error("Error al guardar cuenta");
    }
  }

  async function deleteBankAccount(id: number, isDefault: boolean) {
    const account = bankAccounts.find((b) => b.id === id);
    const name = account?.bankName || account?.name || "esta cuenta";
    const description = isDefault
      ? `"${name}" está marcada como cuenta principal.`
      : undefined;
    if (!await appConfirm({ title: `Eliminar ${name}`, description, confirmLabel: "Eliminar", variant: "destructive" })) return;
    try {
      const res = await fetch(`/api/finance/bank-accounts?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Cuenta eliminada");
        fetchData();
      } else {
        toast.error("Error al eliminar");
      }
    } catch {
      toast.error("Error al eliminar");
    }
  }

  function resetTaxForm() {
    setEditingTax(null);
    setNewTaxName("");
    setNewTaxRate("");
    setNewTaxDefault(false);
  }

  function resetBankForm() {
    setEditingBank(null);
    setNewBankName("");
    setNewBankBankName("");
    setNewBankIban("");
    setNewBankSwift("");
    setNewBankDefault(false);
  }

  function openEditTax(tax: TaxRate) {
    setEditingTax(tax);
    setNewTaxName(tax.name);
    setNewTaxRate(tax.rate);
    setNewTaxDefault(tax.isDefault);
    setTaxDialogOpen(true);
  }

  function openEditBank(bank: BankAccount) {
    setEditingBank(bank);
    setNewBankName(bank.name);
    setNewBankBankName(bank.bankName || "");
    setNewBankIban(bank.iban || "");
    setNewBankSwift(bank.swift || "");
    setNewBankDefault(bank.isDefault);
    setBankDialogOpen(true);
  }

  async function handleStripeConnect() {
    try {
      const res = await fetch("/api/finance/stripe/connect");
      const data = await res.json();
      
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        toast.error(data.error?.message || "Error al conectar con Stripe");
      }
    } catch (error) {
      toast.error("Error al conectar con Stripe");
    }
  }

  async function handleStripeDisconnect() {
    if (!await appConfirm({ title: "Desconectar Stripe", description: "Dejarás de poder recibir pagos en línea hasta que vuelvas a conectar tu cuenta.", confirmLabel: "Desconectar", variant: "destructive" })) return;
    
    try {
      const res = await fetch("/api/finance/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      
      if (res.ok) {
        toast.success("Stripe desconectado");
        fetchData();
      } else {
        toast.error("Error al desconectar Stripe");
      }
    } catch (error) {
      toast.error("Error al desconectar Stripe");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div></div>
        <button
          onClick={saveSettings}
          disabled={saving || !unsavedChanges}
          style={{
            background: unsavedChanges ? "#1A1A1A" : "white",
            color: unsavedChanges ? "white" : "var(--ink-3)",
            border: unsavedChanges
              ? "1px solid #1A1A1A"
              : "1px solid var(--line-strong)",
            padding: "8px 14px",
            borderRadius: "var(--r-sm)",
            fontSize: 12.5,
            fontWeight: 500,
            cursor: saving || !unsavedChanges ? "default" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <RiSaveLine className="h-3 w-3" />
          {saving ? "Guardando…" : unsavedChanges ? "Guardar cambios" : "Sin cambios"}
        </button>
      </div>

      <Tabs
        value={settingsTab}
        onValueChange={(v) => setSettingsTab(v as SettingsTab)}
        className="space-y-1.5"
      >
        {/* Pill tabs — matches prototype's `.tabs` / `.tab` CSS exactly */}
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--bg-subtle)",
            padding: 3,
            borderRadius: "var(--r-sm)",
          }}
        >
          {SETTINGS_TABS.map((t) => {
            const active = settingsTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSettingsTab(t.id)}
                style={{
                  flex: 1,
                  background: active ? "var(--bg-panel)" : "transparent",
                  border: "none",
                  padding: "7px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  color: active ? "var(--ink-1)" : "var(--ink-2)",
                  cursor: "pointer",
                  boxShadow: active ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  transition: "background .15s, color .15s",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {/* Hint subtitle */}
        <div
          style={{
            fontSize: 12,
            color: "var(--ink-3)",
            marginBottom: 16,
            paddingTop: 4,
          }}
        >
          {SETTINGS_TABS.find((t) => t.id === settingsTab)?.hint}
        </div>

        {/* Datos Fiscales → Empresa (rendered first per prototype order) */}
        <TabsContent value="empresa">
          <FSCard
            title="Datos Fiscales"
            subtitle="Información fiscal de tu empresa que aparecerá en los documentos"
          >
            <FSRow>
              <FSField label="Razón Social">
                <input
                  style={fsInputStyle}
                  value={settings?.companyName || ""}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, companyName: e.target.value } : s))
                  }
                  placeholder="Mi Empresa S.L."
                />
              </FSField>
              <FSField label="CIF / NIF">
                <input
                  style={fsInputStyle}
                  value={settings?.taxId || ""}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, taxId: e.target.value } : s))
                  }
                  placeholder="B12345678"
                />
              </FSField>
            </FSRow>
            <FSRow>
              <FSField label="Dirección">
                <input
                  style={fsInputStyle}
                  value={settings?.fiscalAddress || ""}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, fiscalAddress: e.target.value } : s,
                    )
                  }
                  placeholder="Calle Mayor 123"
                />
              </FSField>
              <FSField label="Código Postal">
                <input
                  style={fsInputStyle}
                  value={settings?.fiscalPostalCode || ""}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, fiscalPostalCode: e.target.value } : s,
                    )
                  }
                  placeholder="28013"
                />
              </FSField>
            </FSRow>
            <FSRow>
              <FSField label="Ciudad">
                <input
                  style={fsInputStyle}
                  value={settings?.fiscalCity || ""}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, fiscalCity: e.target.value } : s,
                    )
                  }
                  placeholder="Madrid"
                />
              </FSField>
              <FSField label="País">
                <input
                  style={fsInputStyle}
                  value={settings?.fiscalCountry || ""}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, fiscalCountry: e.target.value } : s,
                    )
                  }
                  placeholder="España"
                />
              </FSField>
            </FSRow>
            <FSRow>
              <FSField label="Email Fiscal">
                <input
                  type="email"
                  style={fsInputStyle}
                  value={settings?.fiscalEmail || ""}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, fiscalEmail: e.target.value } : s,
                    )
                  }
                  placeholder="facturacion@miempresa.com"
                />
              </FSField>
              <FSField label="Teléfono Fiscal">
                <input
                  style={fsInputStyle}
                  value={settings?.fiscalPhone || ""}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, fiscalPhone: e.target.value } : s,
                    )
                  }
                  placeholder="+34 600 000 000"
                />
              </FSField>
            </FSRow>
          </FSCard>
        </TabsContent>

        {/* Configuración General → Empresa */}
        <TabsContent value="empresa">
          <FSCard
            title="Configuración General"
            subtitle="Moneda por defecto y otras opciones generales"
          >
            <FSRow>
              <FSField label="Moneda por Defecto">
                <div style={{ position: "relative" }}>
                  <select
                    value={settings?.defaultCurrency || "EUR"}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, defaultCurrency: e.target.value } : s,
                      )
                    }
                    style={{
                      ...fsInputStyle,
                      appearance: "none",
                      paddingRight: 34,
                      cursor: "pointer",
                    }}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--ink-3)"
                    strokeWidth="2"
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </FSField>
              <FSField label="Días de Validez de Presupuestos">
                <input
                  type="number"
                  style={fsInputStyle}
                  value={settings?.quoteValidityDays || 30}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, quoteValidityDays: parseInt(e.target.value) || 30 } : s,
                    )
                  }
                />
              </FSField>
            </FSRow>
            <FSRow>
              <FSField label="Términos de Pago por Defecto">
                <input
                  style={fsInputStyle}
                  value={settings?.defaultPaymentTerms || ""}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, defaultPaymentTerms: e.target.value } : s,
                    )
                  }
                  placeholder="30 días"
                />
              </FSField>
              <div style={{ flex: 1 }} />
            </FSRow>
          </FSCard>
        </TabsContent>

        {/* Impuestos → Documentos */}
        <TabsContent value="documentos">
          <FSCard
            title="Impuestos"
            subtitle="Tipos de IVA y otros impuestos aplicables"
            action={
              canManageFinance ? (
                <button
                  onClick={() => setTaxDialogOpen(true)}
                  style={{
                    background: "white",
                    border: "1px dashed var(--line-strong)",
                    padding: "7px 12px",
                    borderRadius: "var(--r-sm)",
                    fontSize: 12.5,
                    color: "var(--ink-2)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <RiAddLine className="h-3 w-3" />
                  Añadir impuesto
                </button>
              ) : null
            }
          >
            {taxRates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay impuestos configurados. Crea uno para empezar.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {taxRates.map((tax) => (
                  <div
                    key={tax.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      background: "var(--bg-panel)",
                      border: "1px solid var(--line-strong)",
                      borderRadius: "var(--r-sm)",
                    }}
                  >
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>
                        {tax.name}
                      </span>
                      {tax.isDefault && (
                        <span
                          style={{
                            background: "#D4E4D8",
                            color: "#2F5233",
                            fontSize: 10,
                            fontWeight: 500,
                            padding: "2px 7px",
                            borderRadius: 999,
                          }}
                        >
                          Por defecto
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--ink-1)",
                        minWidth: 45,
                        textAlign: "right",
                      }}
                    >
                      {tax.rate}%
                    </div>
                    <button
                      onClick={() => openEditTax(tax)}
                      title="Editar"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--ink-3)",
                        padding: 4,
                      }}
                    >
                      <RiEditLine className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteTaxRate(tax.id, tax.isDefault)}
                      title="Eliminar"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#B55450",
                        padding: 4,
                      }}
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </FSCard>
          <Sheet
            open={taxDialogOpen}
            onOpenChange={(open) => {
              setTaxDialogOpen(open);
              if (!open) resetTaxForm();
            }}
          >
            <SheetContent className="sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  {editingTax ? "Editar Impuesto" : "Nuevo Impuesto"}
                </SheetTitle>
                <SheetDescription>
                  Define el nombre y la tasa del impuesto
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Inp
                    value={newTaxName}
                    onChange={(e) => setNewTaxName(e.target.value)}
                    placeholder="IVA 21%"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tasa (%)</Label>
                  <Inp
                    type="number"
                    step="0.01"
                    value={newTaxRate}
                    onChange={(e) => setNewTaxRate(e.target.value)}
                    placeholder="21"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newTaxDefault}
                    onCheckedChange={setNewTaxDefault}
                  />
                  <Label>Impuesto por defecto</Label>
                </div>
              </div>
              <SheetFooter>
                <Btn variant="outline" onClick={() => setTaxDialogOpen(false)}>
                  Cancelar
                </Btn>
                <Btn onClick={saveTaxRate}>
                  {editingTax ? "Guardar" : "Crear"}
                </Btn>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </TabsContent>

        {/* Numeración → Documentos */}
        <TabsContent value="documentos">
          <FSCard
            title="Numeración de Documentos"
            subtitle="Configura los prefijos y siguiente número de cada tipo"
          >
            <NumeracionTable settings={settings} setSettings={setSettings} />
          </FSCard>
        </TabsContent>

        {/* Cuentas Bancarias → Cobros */}
        <TabsContent value="cobros">
          <FSCard
            title="Cuentas Bancarias"
            subtitle="Cuentas donde recibirás los pagos"
            action={
              canManageFinance ? (
                <button
                  onClick={() => setBankDialogOpen(true)}
                  style={{
                    background: "white",
                    border: "1px dashed var(--line-strong)",
                    padding: "7px 12px",
                    borderRadius: "var(--r-sm)",
                    fontSize: 12.5,
                    color: "var(--ink-2)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <RiAddLine className="h-3 w-3" />
                  Añadir cuenta bancaria
                </button>
              ) : null
            }
          >
            {bankAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay cuentas bancarias configuradas.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {bankAccounts.map((bank) => {
                  const initials = (bank.bankName || bank.name || "??")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div
                      key={bank.id}
                      style={{
                        padding: 14,
                        background: "var(--bg-panel)",
                        border: "1px solid var(--line-strong)",
                        borderRadius: "var(--r-sm)",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "var(--r-sm)",
                          background: "#E4DDD0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--ink-1)",
                          fontWeight: 600,
                          fontSize: 12,
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--ink-1)",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {bank.bankName || bank.name}
                          {bank.isDefault && (
                            <span
                              style={{
                                background: "#D4E4D8",
                                color: "#2F5233",
                                fontSize: 10,
                                fontWeight: 500,
                                padding: "2px 7px",
                                borderRadius: 999,
                              }}
                            >
                              Principal
                            </span>
                          )}
                        </div>
                        {bank.iban && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--ink-3)",
                              fontFamily: "var(--font-mono, monospace)",
                              marginTop: 2,
                            }}
                          >
                            {bank.iban}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: 11.5,
                            color: "var(--ink-3)",
                            marginTop: 2,
                          }}
                        >
                          {bank.name}
                        </div>
                      </div>
                      <button
                        onClick={() => openEditBank(bank)}
                        title="Editar"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--ink-3)",
                          padding: 6,
                        }}
                      >
                        <RiEditLine className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteBankAccount(bank.id, bank.isDefault)}
                        title="Eliminar"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#B55450",
                          padding: 6,
                        }}
                      >
                        <RiDeleteBinLine className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </FSCard>
          <Sheet
            open={bankDialogOpen}
            onOpenChange={(open) => {
              setBankDialogOpen(open);
              if (!open) resetBankForm();
            }}
          >
            <SheetContent className="sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  {editingBank ? "Editar Cuenta" : "Nueva Cuenta Bancaria"}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 px-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre de la Cuenta</Label>
                  <Inp
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="Cuenta Principal"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Inp
                    value={newBankBankName}
                    onChange={(e) => setNewBankBankName(e.target.value)}
                    placeholder="Santander, BBVA, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <div style={{ position: "relative" }}>
                    <Inp
                      value={newBankIban}
                      onChange={(e) => handleBankIbanChange(e.target.value)}
                      onBlur={handleBankIbanBlur}
                      placeholder="ES00 0000 0000 0000 0000 0000"
                      style={cleanIban(newBankIban).length >= 15 ? { borderColor: validateIban(cleanIban(newBankIban)) ? "#22C55E" : "#EF4444" } : {}}
                    />
                  </div>
                  {bankAutofillMsg && (
                    <p style={{ fontSize: 11, color: "#166534", background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 6, padding: "4px 8px" }}>
                      ✓ {bankAutofillMsg}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>SWIFT/BIC</Label>
                  <Inp
                    value={newBankSwift}
                    onChange={(e) => setNewBankSwift(e.target.value.toUpperCase())}
                    placeholder="BSCHESMMXXX"
                    style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newBankDefault}
                    onCheckedChange={setNewBankDefault}
                  />
                  <Label>Cuenta por defecto</Label>
                </div>
              </div>
              <SheetFooter>
                <Btn variant="outline" onClick={() => setBankDialogOpen(false)}>
                  Cancelar
                </Btn>
                <Btn onClick={saveBankAccount}>
                  {editingBank ? "Guardar" : "Crear"}
                </Btn>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </TabsContent>

        {/* Métodos de Pago → Cobros */}
        <TabsContent value="cobros">
          <FSCard
            title="Métodos de Pago"
            subtitle="Habilita los métodos de pago disponibles para tus clientes"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Efectivo</p>
                  <p className="text-sm text-muted-foreground">
                    Permite pagos en efectivo
                  </p>
                </div>
                <Switch
                  checked={settings?.enableCash || false}
                  onCheckedChange={(checked) =>
                    setSettings((s) => s ? { ...s, enableCash: checked } : s)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Transferencia Bancaria</p>
                  <p className="text-sm text-muted-foreground">
                    Permite pagos por transferencia
                  </p>
                </div>
                <Switch
                  checked={settings?.enableBankTransfer || false}
                  onCheckedChange={(checked) =>
                    setSettings((s) => s ? { ...s, enableBankTransfer: checked } : s)
                  }
                />
              </div>

              {/* Stripe Section - Expanded */}
              <div className="border rounded-lg overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 dark:bg-violet-900/50 rounded-lg">
                      <RiBankCardLine className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">Pagos con Stripe</p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <RiInformationLine className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Cada organización conecta su propia cuenta de Stripe. Los pagos van directamente a tu cuenta.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Permite a tus clientes pagar facturas con tarjeta de crédito/débito
                      </p>
                    </div>
                    {settings?.stripeAccountId ? (
                      <Pill bg="#D1FAE5" color="#065F46">
                        Conectado
                      </Pill>
                    ) : (
                      <Pill bg="transparent" style={{ border: "1px solid var(--line-strong)" }}>
                        No conectado
                      </Pill>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {!settings?.stripeAccountId ? (
                    <>
                      {/* Requirements */}
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-2">
                          Requisitos para conectar Stripe:
                        </p>
                        <ul className="text-sm text-amber-700 dark:text-amber-500 space-y-1">
                          <li>• Cuenta de Stripe verificada</li>
                          <li>• Verificación de identidad completada</li>
                          <li>• Cuenta bancaria vinculada para recibir pagos</li>
                        </ul>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3">
                        <Btn
                          variant="outline"
                          size="sm"
                          onClick={() => window.open("https://dashboard.stripe.com/register", "_blank")}
                        >
                          <RiExternalLinkLine className="h-4 w-4 mr-2" />
                          Crear cuenta en Stripe
                        </Btn>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Btn
                                variant="primary"
                                size="sm"
                                onClick={handleStripeConnect}
                              >
                                Conectar mi cuenta de Stripe
                              </Btn>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Vincula tu cuenta de Stripe para recibir pagos con tarjeta</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Connected state */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Cuenta conectada:</p>
                          <p className="font-mono text-sm">{settings.stripeAccountId}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Btn
                            variant="outline"
                            size="sm"
                            onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
                          >
                            <RiExternalLinkLine className="h-4 w-4 mr-2" />
                            Abrir Stripe Dashboard
                          </Btn>
                          <Btn
                            variant="ghost"
                            size="sm"
                            onClick={handleStripeDisconnect}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Desconectar
                          </Btn>
                        </div>
                      </div>

                      {/* Enable/Disable toggle */}
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Habilitar pagos online</p>
                          <p className="text-xs text-muted-foreground">
                            Activa para mostrar el botón de pago en facturas
                          </p>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Switch
                                  checked={settings?.enableStripe || false}
                                  onCheckedChange={(checked) =>
                                    setSettings((s) => s ? { ...s, enableStripe: checked } : s)
                                  }
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Activa/desactiva pagos online para esta organización</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </FSCard>
        </TabsContent>

        {/* Terms Tab */}
        <TabsContent value="documentos">
          <FSCard
            title="Términos y Condiciones"
            subtitle="Textos que aparecerán al pie de los documentos"
          >
            <FSRow>
              <FSField label="Términos de Presupuestos">
                <textarea
                  style={{
                    ...fsInputStyle,
                    minHeight: 90,
                    resize: "vertical",
                    lineHeight: 1.5,
                  }}
                  placeholder="Este presupuesto tiene una validez de 15 días desde la fecha de emisión. Los precios incluyen IVA."
                />
              </FSField>
            </FSRow>
            <FSRow>
              <FSField label="Términos de Facturas">
                <textarea
                  style={{
                    ...fsInputStyle,
                    minHeight: 90,
                    resize: "vertical",
                    lineHeight: 1.5,
                  }}
                  value={settings?.defaultTermsAndConditions || ""}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, defaultTermsAndConditions: e.target.value } : s,
                    )
                  }
                  placeholder="El pago deberá realizarse en un plazo de 15 días desde la fecha de factura. En caso de retraso, se aplicarán los intereses legales vigentes."
                />
              </FSField>
            </FSRow>
            <FSRow>
              <FSField label="Nota de pie de página">
                <input
                  style={fsInputStyle}
                  placeholder="Gracias por confiar en Hubents · hello@hubents.com · +34 910 00 00 00"
                />
              </FSField>
            </FSRow>
          </FSCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FinanceSettingsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    }>
      <FinanceSettingsContent />
    </Suspense>
  );
}
