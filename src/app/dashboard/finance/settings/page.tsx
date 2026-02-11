"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  RiCheckLine,
  RiBankLine,
  RiAlertLine,
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

function FinanceSettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<FinanceSettings | null>(null);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  
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

  // Check for Stripe callback messages
  useEffect(() => {
    const stripeSuccess = searchParams.get("stripe_success");
    const stripeError = searchParams.get("stripe_error");
    
    if (stripeSuccess === "true") {
      toast.success("¡Stripe conectado correctamente! Ya puedes recibir pagos con tarjeta.");
      // Clean URL
      router.replace("/dashboard/finance/settings?tab=payments");
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
      router.replace("/dashboard/finance/settings?tab=payments");
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

  async function deleteTaxRate(id: number) {
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
    } catch (error) {
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

  async function deleteBankAccount(id: number) {
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
    } catch (error) {
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
    if (!confirm("¿Estás seguro de desconectar tu cuenta de Stripe?")) return;
    
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración Financiera</h1>
          <p className="text-muted-foreground">
            Configura monedas, impuestos, numeración y métodos de pago
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unsavedChanges && (
            <div className="flex items-center gap-2 text-amber-600">
              <RiAlertLine className="h-4 w-4" />
              <span className="text-sm">Cambios sin guardar</span>
            </div>
          )}
          <Button 
            onClick={saveSettings} 
            disabled={saving || !unsavedChanges}
            variant={unsavedChanges ? "default" : "outline"}
          >
            <RiSaveLine className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : unsavedChanges ? "Guardar Cambios" : "Sin cambios"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="fiscal">Datos Fiscales</TabsTrigger>
          <TabsTrigger value="taxes">Impuestos</TabsTrigger>
          <TabsTrigger value="numbering">Numeración</TabsTrigger>
          <TabsTrigger value="banks">Cuentas Bancarias</TabsTrigger>
          <TabsTrigger value="payments">Métodos de Pago</TabsTrigger>
          <TabsTrigger value="terms">Términos</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>
                Moneda por defecto y otras opciones generales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Moneda por Defecto</Label>
                  <Select
                    value={settings?.defaultCurrency || "EUR"}
                    onValueChange={(value) =>
                      setSettings((s) => s ? { ...s, defaultCurrency: value } : s)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Días de Validez de Presupuestos</Label>
                  <Input
                    type="number"
                    value={settings?.quoteValidityDays || 30}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, quoteValidityDays: parseInt(e.target.value) || 30 } : s
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Términos de Pago por Defecto</Label>
                  <Input
                    value={settings?.defaultPaymentTerms || ""}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, defaultPaymentTerms: e.target.value } : s
                      )
                    }
                    placeholder="30 días"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fiscal Data Tab */}
        <TabsContent value="fiscal">
          <Card>
            <CardHeader>
              <CardTitle>Datos Fiscales</CardTitle>
              <CardDescription>
                Información fiscal que aparecerá en facturas y presupuestos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Razón Social / Nombre Empresa</Label>
                  <Input
                    value={settings?.companyName || ""}
                    onChange={(e) =>
                      setSettings((s) => s ? { ...s, companyName: e.target.value } : s)
                    }
                    placeholder="Mi Empresa S.L."
                  />
                </div>
                <div className="space-y-2">
                  <Label>NIF / CIF</Label>
                  <Input
                    value={settings?.taxId || ""}
                    onChange={(e) =>
                      setSettings((s) => s ? { ...s, taxId: e.target.value } : s)
                    }
                    placeholder="B12345678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dirección Fiscal</Label>
                <Input
                  value={settings?.fiscalAddress || ""}
                  onChange={(e) =>
                    setSettings((s) => s ? { ...s, fiscalAddress: e.target.value } : s)
                  }
                  placeholder="Calle Example 123, 1ºA"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input
                    value={settings?.fiscalCity || ""}
                    onChange={(e) =>
                      setSettings((s) => s ? { ...s, fiscalCity: e.target.value } : s)
                    }
                    placeholder="Madrid"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código Postal</Label>
                  <Input
                    value={settings?.fiscalPostalCode || ""}
                    onChange={(e) =>
                      setSettings((s) => s ? { ...s, fiscalPostalCode: e.target.value } : s)
                    }
                    placeholder="28001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>País</Label>
                  <Input
                    value={settings?.fiscalCountry || ""}
                    onChange={(e) =>
                      setSettings((s) => s ? { ...s, fiscalCountry: e.target.value } : s)
                    }
                    placeholder="España"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email Fiscal</Label>
                  <Input
                    type="email"
                    value={settings?.fiscalEmail || ""}
                    onChange={(e) =>
                      setSettings((s) => s ? { ...s, fiscalEmail: e.target.value } : s)
                    }
                    placeholder="facturacion@miempresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono Fiscal</Label>
                  <Input
                    value={settings?.fiscalPhone || ""}
                    onChange={(e) =>
                      setSettings((s) => s ? { ...s, fiscalPhone: e.target.value } : s)
                    }
                    placeholder="+34 600 000 000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Taxes Tab */}
        <TabsContent value="taxes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Impuestos</CardTitle>
                <CardDescription>
                  Configura las tasas de impuestos disponibles
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setTaxDialogOpen(true)}>
                <RiAddLine className="mr-2 h-4 w-4" />
                Nuevo Impuesto
              </Button>
              <Sheet open={taxDialogOpen} onOpenChange={(open) => {
                setTaxDialogOpen(open);
                if (!open) resetTaxForm();
              }}>
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
                      <Input
                        value={newTaxName}
                        onChange={(e) => setNewTaxName(e.target.value)}
                        placeholder="IVA 21%"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tasa (%)</Label>
                      <Input
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
                    <Button variant="outline" onClick={() => setTaxDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={saveTaxRate}>
                      {editingTax ? "Guardar" : "Crear"}
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </CardHeader>
            <CardContent>
              {taxRates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay impuestos configurados. Crea uno para empezar.
                </p>
              ) : (
                <div className="space-y-2">
                  {taxRates.map((tax) => (
                    <div
                      key={tax.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{tax.name}</span>
                        <Badge variant="secondary">{tax.rate}%</Badge>
                        {tax.isDefault && (
                          <Badge variant="outline" className="text-green-600">
                            <RiCheckLine className="mr-1 h-3 w-3" />
                            Por defecto
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditTax(tax)}
                        >
                          <RiEditLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTaxRate(tax.id)}
                        >
                          <RiDeleteBinLine className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Numbering Tab */}
        <TabsContent value="numbering">
          <Card>
            <CardHeader>
              <CardTitle>Numeración de Documentos</CardTitle>
              <CardDescription>
                Configura los prefijos y números de secuencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prefijo Presupuestos</Label>
                  <div className="flex gap-2">
                    <Input
                      value={settings?.quotePrefix || ""}
                      onChange={(e) =>
                        setSettings((s) => s ? { ...s, quotePrefix: e.target.value } : s)
                      }
                      className="w-24"
                    />
                    <Input
                      type="number"
                      value={settings?.nextQuoteNumber || 1}
                      onChange={(e) =>
                        setSettings((s) =>
                          s ? { ...s, nextQuoteNumber: parseInt(e.target.value) || 1 } : s
                        )
                      }
                      className="w-24"
                    />
                    <span className="flex items-center text-sm text-muted-foreground">
                      → {settings?.quotePrefix}-{new Date().getFullYear()}-
                      {String(settings?.nextQuoteNumber || 1).padStart(4, "0")}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Prefijo Facturas</Label>
                  <div className="flex gap-2">
                    <Input
                      value={settings?.invoicePrefix || ""}
                      onChange={(e) =>
                        setSettings((s) => s ? { ...s, invoicePrefix: e.target.value } : s)
                      }
                      className="w-24"
                    />
                    <Input
                      type="number"
                      value={settings?.nextInvoiceNumber || 1}
                      onChange={(e) =>
                        setSettings((s) =>
                          s ? { ...s, nextInvoiceNumber: parseInt(e.target.value) || 1 } : s
                        )
                      }
                      className="w-24"
                    />
                    <span className="flex items-center text-sm text-muted-foreground">
                      → {settings?.invoicePrefix}-{new Date().getFullYear()}-
                      {String(settings?.nextInvoiceNumber || 1).padStart(4, "0")}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Prefijo Proformas</Label>
                  <div className="flex gap-2">
                    <Input
                      value={settings?.proformaPrefix || ""}
                      onChange={(e) =>
                        setSettings((s) => s ? { ...s, proformaPrefix: e.target.value } : s)
                      }
                      className="w-24"
                    />
                    <Input
                      type="number"
                      value={settings?.nextProformaNumber || 1}
                      onChange={(e) =>
                        setSettings((s) =>
                          s ? { ...s, nextProformaNumber: parseInt(e.target.value) || 1 } : s
                        )
                      }
                      className="w-24"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Prefijo Albaranes</Label>
                  <div className="flex gap-2">
                    <Input
                      value={settings?.deliveryNotePrefix || ""}
                      onChange={(e) =>
                        setSettings((s) => s ? { ...s, deliveryNotePrefix: e.target.value } : s)
                      }
                      className="w-24"
                    />
                    <Input
                      type="number"
                      value={settings?.nextDeliveryNoteNumber || 1}
                      onChange={(e) =>
                        setSettings((s) =>
                          s ? { ...s, nextDeliveryNoteNumber: parseInt(e.target.value) || 1 } : s
                        )
                      }
                      className="w-24"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Prefijo Notas de Crédito</Label>
                  <div className="flex gap-2">
                    <Input
                      value={settings?.creditNotePrefix || ""}
                      onChange={(e) =>
                        setSettings((s) => s ? { ...s, creditNotePrefix: e.target.value } : s)
                      }
                      className="w-24"
                    />
                    <Input
                      type="number"
                      value={settings?.nextCreditNoteNumber || 1}
                      onChange={(e) =>
                        setSettings((s) =>
                          s ? { ...s, nextCreditNoteNumber: parseInt(e.target.value) || 1 } : s
                        )
                      }
                      className="w-24"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Accounts Tab */}
        <TabsContent value="banks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cuentas Bancarias</CardTitle>
                <CardDescription>
                  Configura las cuentas bancarias para recibir pagos
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setBankDialogOpen(true)}>
                <RiAddLine className="mr-2 h-4 w-4" />
                Nueva Cuenta
              </Button>
              <Sheet open={bankDialogOpen} onOpenChange={(open) => {
                setBankDialogOpen(open);
                if (!open) resetBankForm();
              }}>
                <SheetContent className="sm:max-w-2xl overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>
                      {editingBank ? "Editar Cuenta" : "Nueva Cuenta Bancaria"}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4 px-4 py-4">
                    <div className="space-y-2">
                      <Label>Nombre de la Cuenta</Label>
                      <Input
                        value={newBankName}
                        onChange={(e) => setNewBankName(e.target.value)}
                        placeholder="Cuenta Principal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Banco</Label>
                      <Input
                        value={newBankBankName}
                        onChange={(e) => setNewBankBankName(e.target.value)}
                        placeholder="Santander, BBVA, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IBAN</Label>
                      <Input
                        value={newBankIban}
                        onChange={(e) => setNewBankIban(e.target.value)}
                        placeholder="ES00 0000 0000 0000 0000 0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SWIFT/BIC</Label>
                      <Input
                        value={newBankSwift}
                        onChange={(e) => setNewBankSwift(e.target.value)}
                        placeholder="BSCHESMMXXX"
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
                    <Button variant="outline" onClick={() => setBankDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={saveBankAccount}>
                      {editingBank ? "Guardar" : "Crear"}
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </CardHeader>
            <CardContent>
              {bankAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay cuentas bancarias configuradas.
                </p>
              ) : (
                <div className="space-y-2">
                  {bankAccounts.map((bank) => (
                    <div
                      key={bank.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <RiBankLine className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{bank.name}</span>
                          {bank.bankName && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({bank.bankName})
                            </span>
                          )}
                          {bank.iban && (
                            <p className="text-xs text-muted-foreground">{bank.iban}</p>
                          )}
                        </div>
                        {bank.isDefault && (
                          <Badge variant="outline" className="text-green-600">
                            Por defecto
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditBank(bank)}
                        >
                          <RiEditLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteBankAccount(bank.id)}
                        >
                          <RiDeleteBinLine className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Métodos de Pago</CardTitle>
              <CardDescription>
                Habilita los métodos de pago disponibles para tus clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                        Conectado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        No conectado
                      </Badge>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open("https://dashboard.stripe.com/register", "_blank")}
                        >
                          <RiExternalLinkLine className="h-4 w-4 mr-2" />
                          Crear cuenta en Stripe
                        </Button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="default" 
                                size="sm" 
                                onClick={handleStripeConnect}
                              >
                                Conectar mi cuenta de Stripe
                              </Button>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
                          >
                            <RiExternalLinkLine className="h-4 w-4 mr-2" />
                            Abrir Stripe Dashboard
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={handleStripeDisconnect}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Desconectar
                          </Button>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Terms Tab */}
        <TabsContent value="terms">
          <Card>
            <CardHeader>
              <CardTitle>Términos y Condiciones</CardTitle>
              <CardDescription>
                Texto por defecto para presupuestos y facturas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings?.defaultTermsAndConditions || ""}
                onChange={(e) =>
                  setSettings((s) =>
                    s ? { ...s, defaultTermsAndConditions: e.target.value } : s
                  )
                }
                placeholder="Escribe aquí los términos y condiciones por defecto..."
                rows={10}
              />
            </CardContent>
          </Card>
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
