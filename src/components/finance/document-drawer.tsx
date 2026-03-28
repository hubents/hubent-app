"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiSaveLine,
  RiLoader4Line,
  RiEyeLine,
  RiCheckDoubleLine,
  RiFileCopyLine,
  RiExchangeLine,
  RiTruckLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { LiveDocumentPreview, type OrganizationPreviewData } from "./live-document-preview";
import { ContactSelector, type ContactSelectorValue } from "./contact-selector";
import { cn } from "@/lib/utils";

type DocumentType = "quote" | "invoice" | "proforma" | "delivery_note" | "credit_note";

interface DocumentItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
}

interface Event {
  id: number;
  name: string;
}

interface TaxRate {
  id: number;
  name: string;
  rate: string;
  isDefault: boolean;
  isActive?: boolean;
}

interface BankAccount {
  id: number;
  name: string;
  bankName: string | null;
  iban: string | null;
  swift: string | null;
  isDefault: boolean;
}

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

export function DocumentDrawer({
  open,
  onOpenChange,
  type,
  documentId,
  initialData,
  onSuccess,
  onDuplicate,
  onConvert,
  saveEndpoint,
  lockedEvent,
  lockedClientLabel,
  eventsEndpoint,
  vendorsEndpoint,
}: DocumentDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [documentNumber, setDocumentNumber] = useState<string | undefined>();
  const [documentStatus, setDocumentStatus] = useState<string | undefined>();

  const isDeliveryNote = type === "delivery_note";

  // Form state
  const [contactValue, setContactValue] = useState<ContactSelectorValue | null>(null);
  const [eventId, setEventId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [globalDiscountEnabled, setGlobalDiscountEnabled] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalDiscountType, setGlobalDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [items, setItems] = useState<DocumentItem[]>([
    { description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 21, total: 0 },
  ]);

  // Reference data
  const [events, setEvents] = useState<Event[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);
  const [orgData, setOrgData] = useState<OrganizationPreviewData | undefined>();
  const [preloadedVendors, setPreloadedVendors] = useState<Array<{ id: number; type: "vendor"; name: string; email: string | null; category?: string | null }> | undefined>();

  useEffect(() => {
    if (open) {
      fetchReferenceData();
      if (lockedEvent) {
        setEventId(lockedEvent.id.toString());
      }
      if (documentId) {
        fetchDocument();
      } else if (initialData) {
        if (initialData.contactId) {
          setContactValue({ type: "contact", id: initialData.contactId });
        } else if (initialData.vendorId) {
          setContactValue({ type: "vendor", id: initialData.vendorId });
        }
        if (!lockedEvent) {
          setEventId(initialData.eventId?.toString() || "");
        }
        setNotes(initialData.notes || "");
        setTermsAndConditions(initialData.termsAndConditions || "");
        if (initialData.paymentMethod) setPaymentMethod(initialData.paymentMethod);
        if (initialData.bankAccountId) setBankAccountId(initialData.bankAccountId.toString());
        if (initialData.globalDiscount && initialData.globalDiscount > 0) {
          setGlobalDiscountEnabled(true);
          setGlobalDiscount(initialData.globalDiscount);
          setGlobalDiscountType(initialData.globalDiscountType || "percentage");
        }
        if (initialData.items && initialData.items.length > 0) {
          setItems(initialData.items);
        }
      } else {
        resetForm();
        if (lockedEvent) {
          setEventId(lockedEvent.id.toString());
        }
      }
    }
  }, [open, documentId, initialData]);

  function resetForm() {
    setContactValue(null);
    setEventId("");
    setDueDate("");
    setValidUntil("");
    setNotes("");
    setTermsAndConditions("");
    setPaymentMethod("");
    setBankAccountId("");
    setGlobalDiscountEnabled(false);
    setGlobalDiscount(0);
    setGlobalDiscountType("percentage");
    setDocumentNumber(undefined);
    setDocumentStatus(undefined);
    setItems([{ description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: defaultTaxRate, total: 0 }]);
  }

  async function fetchReferenceData() {
    try {
      const [eventsRes, taxRatesRes, settingsRes, bankAccountsRes] = await Promise.all([
        lockedEvent ? Promise.resolve(null) : fetch(eventsEndpoint || "/api/events?scope=accessible"),
        fetch("/api/finance/tax-rates"),
        fetch("/api/finance/settings"),
        fetch("/api/finance/bank-accounts"),
      ]);

      if (eventsRes?.ok) {
        const data = await (eventsRes as Response).json();
        setEvents(data.data || []);
      }

      if (taxRatesRes.ok) {
        const data = await taxRatesRes.json();
        setTaxRates(data.data || []);
        const defaultRate = data.data?.find((t: TaxRate) => t.isDefault);
        if (defaultRate) {
          setDefaultTaxRate(parseFloat(defaultRate.rate));
        }
      }

      if (bankAccountsRes.ok) {
        const data = await bankAccountsRes.json();
        setBankAccounts(data.data || []);
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data.data?.defaultTermsAndConditions && !documentId && !initialData) {
          setTermsAndConditions(data.data.defaultTermsAndConditions);
        }
        if (data.data?.quoteValidityDays && type === "quote" && !documentId && !initialData) {
          const validDate = new Date();
          validDate.setDate(validDate.getDate() + data.data.quoteValidityDays);
          setValidUntil(validDate.toISOString().split("T")[0]);
        }
        if (!documentId && !initialData) {
          if (data.data?.defaultPaymentMethod) setPaymentMethod(data.data.defaultPaymentMethod);
          if (data.data?.defaultBankAccountId) setBankAccountId(data.data.defaultBankAccountId.toString());
        }
      }

      // Fetch custom vendors for providers (planner orgs)
      if (vendorsEndpoint) {
        try {
          const vendorsRes = await fetch(vendorsEndpoint);
          if (vendorsRes.ok) {
            const vData = await vendorsRes.json();
            setPreloadedVendors(
              (vData.data || []).map((v: any) => ({
                id: v.id,
                type: "vendor" as const,
                name: v.name,
                email: v.email || null,
                category: v.category || null,
              }))
            );
          }
        } catch {}
      }

      // Fetch organization data for preview (fiscal + logo)
      const profileRes = await fetch("/api/user/profile");
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const org = profileData.data?.organization;
        if (org) {
          setOrgData({
            name: org.fiscalName || org.name,
            taxId: org.taxId || undefined,
            fiscalAddress: org.fiscalAddress || undefined,
            fiscalCity: org.fiscalCity || undefined,
            fiscalPostalCode: org.fiscalPostalCode || undefined,
            fiscalCountry: org.fiscalCountry || undefined,
            fiscalEmail: org.fiscalEmail || undefined,
            fiscalPhone: org.fiscalPhone || undefined,
            invoiceLogo: org.invoiceLogo || org.logo || undefined,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch reference data:", error);
    }
  }

  async function fetchDocument() {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/documents/${documentId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const doc = data.data;
          if (doc.contactId) {
            setContactValue({
              type: "contact", id: doc.contactId,
              name: doc.contactName || undefined,
              email: doc.contactEmail || undefined,
              phone: doc.contactPhone || undefined,
              address: doc.contactAddress || undefined,
              taxId: doc.contactTaxId || undefined,
            });
          } else if (doc.vendorId) {
            setContactValue({
              type: "vendor", id: doc.vendorId,
              name: doc.vendorName || undefined,
              email: doc.vendorEmail || undefined,
              phone: doc.vendorPhone || undefined,
              address: doc.vendorAddress || undefined,
            });
          }
          setDocumentNumber(doc.number || undefined);
          setDocumentStatus(doc.status || undefined);
          setEventId(doc.eventId?.toString() || "");
          setDueDate(doc.dueDate ? doc.dueDate.split("T")[0] : "");
          setValidUntil(doc.validUntil ? doc.validUntil.split("T")[0] : "");
          setNotes(doc.notes || "");
          setTermsAndConditions(doc.termsAndConditions || "");
          setPaymentMethod(doc.paymentMethod || "");
          setBankAccountId(doc.bankAccountId?.toString() || "");
          const gd = parseFloat(doc.globalDiscount || "0");
          if (gd > 0) {
            setGlobalDiscountEnabled(true);
            setGlobalDiscount(gd);
            setGlobalDiscountType(doc.globalDiscountType || "percentage");
          }
          if (doc.items?.length > 0) {
            setItems(
              doc.items.map((item: any) => ({
                id: item.id,
                description: item.description,
                quantity: parseFloat(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                discount: parseFloat(item.discount || "0"),
                taxRate: parseFloat(item.taxRate || "21"),
                total: parseFloat(item.total),
              }))
            );
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch document:", error);
      toast.error("Error al cargar el documento");
    } finally {
      setLoading(false);
    }
  }

  function addItem() {
    setItems([
      ...items,
      { description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: defaultTaxRate, total: 0 },
    ]);
  }

  function removeItem(index: number) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof DocumentItem, value: string | number) {
    const newItems = [...items];
    const item = { ...newItems[index] };

    if (field === "description") {
      item.description = value as string;
    } else {
      item[field] = parseFloat(value as string) || 0;
    }

    // Recalculate total
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = subtotal * (item.discount / 100);
    item.total = subtotal - discountAmount;

    newItems[index] = item;
    setItems(newItems);
  }

  function calculateTotals() {
    let subtotalLines = 0;
    let taxAmount = 0;

    items.forEach((item) => {
      subtotalLines += item.total;
    });

    // Apply global discount
    let globalDiscountAmount = 0;
    if (globalDiscountEnabled && globalDiscount > 0) {
      globalDiscountAmount = globalDiscountType === "percentage"
        ? subtotalLines * (globalDiscount / 100)
        : globalDiscount;
    }
    const subtotalAfterDiscount = subtotalLines - globalDiscountAmount;

    // Calculate tax on subtotal after global discount
    items.forEach((item) => {
      const proportion = subtotalLines > 0 ? item.total / subtotalLines : 0;
      const taxableAmount = subtotalAfterDiscount * proportion;
      taxAmount += taxableAmount * (item.taxRate / 100);
    });

    return {
      subtotalLines,
      globalDiscountAmount,
      subtotalAfterDiscount,
      taxAmount,
      total: subtotalAfterDiscount + taxAmount,
    };
  }

  async function handleSubmit() {
    if (items.length === 0 || !items.some((item) => item.description.trim())) {
      toast.error("Agrega al menos un ítem con descripción");
      return;
    }

    setSaving(true);
    try {
      const direction = contactValue?.type === "vendor" ? "incoming" : "outgoing";

      const payload = {
        type,
        contactId: contactValue?.type === "contact" ? contactValue.id : undefined,
        vendorId: contactValue?.type === "vendor" ? contactValue.id : undefined,
        eventId: eventId ? parseInt(eventId) : undefined,
        dueDate: dueDate || undefined,
        validUntil: validUntil || undefined,
        notes: notes || undefined,
        termsAndConditions: termsAndConditions || undefined,
        paymentMethod: paymentMethod || undefined,
        bankAccountId: bankAccountId ? parseInt(bankAccountId) : undefined,
        globalDiscount: globalDiscountEnabled ? globalDiscount : 0,
        globalDiscountType: globalDiscountEnabled ? globalDiscountType : "percentage",
        direction,
        status: documentId ? undefined : "sent",
        items: items.filter((item) => item.description.trim()).map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: isDeliveryNote ? 0 : item.unitPrice,
          discount: isDeliveryNote ? 0 : item.discount,
          taxRate: isDeliveryNote ? 0 : item.taxRate,
        })),
      };

      const url = documentId
        ? `/api/finance/documents/${documentId}`
        : (saveEndpoint || "/api/finance/documents");
      const method = documentId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(documentId ? "Documento actualizado" : `${typeLabels[type]} guardado`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        const error = await res.json();
        toast.error(error.error?.message || "Error al guardar");
      }
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const totals = calculateTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const selectedBank = bankAccounts.find((b) => b.id.toString() === bankAccountId);

  // Build preview data
  const previewData = useMemo(() => {
    const selectedEvent = events.find((e) => e.id.toString() === eventId);

    return {
      type,
      contactName: contactValue?.type === "contact" ? contactValue.name : undefined,
      vendorName: contactValue?.type === "vendor" ? contactValue.name : undefined,
      contactEmail: contactValue?.email || undefined,
      contactPhone: contactValue?.phone || undefined,
      contactAddress: contactValue?.address || undefined,
      contactTaxId: contactValue?.taxId || undefined,
      eventName: selectedEvent?.name,
      documentNumber,
      documentId: documentId || undefined,
      status: documentStatus,
      items,
      notes,
      termsAndConditions,
      dueDate,
      validUntil,
      organization: orgData,
      globalDiscount,
      globalDiscountType,
      globalDiscountEnabled,
      paymentMethod: paymentMethod || undefined,
    };
  }, [type, contactValue, eventId, items, notes, termsAndConditions, dueDate, validUntil, events, orgData, documentNumber, documentId, documentStatus, globalDiscount, globalDiscountType, globalDiscountEnabled, paymentMethod]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className={cn(
          "overflow-hidden p-0 flex flex-col",
          showPreview ? "w-full sm:max-w-[1500px]" : "w-full sm:max-w-5xl"
        )}
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>
                {documentId ? `Editar ${typeLabels[type]}` : `Nuevo ${typeLabels[type]}`}
              </SheetTitle>
              <SheetDescription>
                {documentId
                  ? `Modifica los datos del ${typeLabels[type].toLowerCase()}`
                  : `Crea un nuevo ${typeLabels[type].toLowerCase()}`}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <RiEyeLine className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="preview-toggle" className="text-sm text-muted-foreground cursor-pointer">
                Vista previa
              </Label>
              <Switch
                id="preview-toggle"
                checked={showPreview}
                onCheckedChange={setShowPreview}
              />
            </div>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <RiLoader4Line className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className={cn("flex-1 overflow-hidden", showPreview ? "flex" : "overflow-y-auto")}>
            {/* Form Section */}
            <div className={cn(
              "overflow-y-auto p-6",
              showPreview ? "w-1/2 border-r" : "w-full"
            )}>
            <div className="space-y-6">
            {/* Contact Selector + Event */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente / Proveedor</Label>
                {lockedClientLabel ? (
                  <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 text-sm">
                    {lockedClientLabel}
                  </div>
                ) : (
                  <ContactSelector
                    value={contactValue}
                    onChange={setContactValue}
                    vendors={preloadedVendors}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Evento {lockedEvent ? "" : "(opcional)"}</Label>
                {lockedEvent ? (
                  <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 text-sm font-medium">
                    {lockedEvent.name}
                  </div>
                ) : (
                  <Select
                    value={eventId || "none"}
                    onValueChange={(v) => setEventId(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vincular a evento..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin evento</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id.toString()}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              {type === "quote" ? (
                <div className="space-y-2">
                  <Label>Válido hasta</Label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Fecha de vencimiento</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Payment Method (not for delivery notes) */}
            {!isDeliveryNote && (
              <>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Método de pago</Label>
                    <Select
                      value={paymentMethod || "none"}
                      onValueChange={(v) => setPaymentMethod(v === "none" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin especificar</SelectItem>
                        {paymentMethodOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {paymentMethod === "bank_transfer" && (
                    <div className="space-y-2">
                      <Label>Cuenta bancaria</Label>
                      <Select
                        value={bankAccountId || "none"}
                        onValueChange={(v) => setBankAccountId(v === "none" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cuenta..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin especificar</SelectItem>
                          {bankAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>
                              {acc.name} {acc.iban && `(${acc.iban.slice(-8)})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedBank?.iban && (
                        <p className="text-xs text-muted-foreground">
                          IBAN: {selectedBank.iban}
                          {selectedBank.swift && ` · BIC: ${selectedBank.swift}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Líneas</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <RiAddLine className="mr-1 h-4 w-4" />
                  Añadir línea
                </Button>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Descripción</TableHead>
                      <TableHead className="w-24">Cant.</TableHead>
                      {!isDeliveryNote && (
                        <>
                          <TableHead className="w-28">Precio</TableHead>
                          <TableHead className="w-24">Dto.%</TableHead>
                          <TableHead className="w-32">IVA%</TableHead>
                          <TableHead className="w-28 text-right">Total</TableHead>
                        </>
                      )}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            placeholder="Descripción del servicio..."
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          />
                        </TableCell>
                        {!isDeliveryNote && (
                          <>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount}
                                onChange={(e) => updateItem(index, "discount", e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.taxRate.toString()}
                                onValueChange={(v) => updateItem(index, "taxRate", v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {taxRates.length > 0 ? (
                                    taxRates.filter(t => t.isActive !== false).map((tax) => (
                                      <SelectItem key={tax.id} value={parseFloat(tax.rate).toString()}>
                                        {tax.name} ({parseFloat(tax.rate)}%)
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <>
                                      <SelectItem value="0">Exento (0%)</SelectItem>
                                      <SelectItem value="4">Superreducido (4%)</SelectItem>
                                      <SelectItem value="10">Reducido (10%)</SelectItem>
                                      <SelectItem value="21">General (21%)</SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.total)}
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                          >
                            <RiDeleteBinLine className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Global Discount (not for delivery notes) */}
              {!isDeliveryNote && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="global-discount"
                      checked={globalDiscountEnabled}
                      onCheckedChange={(checked) => {
                        setGlobalDiscountEnabled(!!checked);
                        if (!checked) setGlobalDiscount(0);
                      }}
                    />
                    <Label htmlFor="global-discount" className="text-sm cursor-pointer">
                      Descuento global
                    </Label>
                  </div>
                  {globalDiscountEnabled && (
                    <div className="flex items-center gap-2 pl-6">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={globalDiscount}
                        onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                        className="w-28"
                      />
                      <Select
                        value={globalDiscountType}
                        onValueChange={(v) => setGlobalDiscountType(v as "percentage" | "fixed")}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="fixed">€</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Totals (not for delivery notes) */}
              {!isDeliveryNote && (
                <div className="flex justify-end">
                  <div className="w-72 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(totals.subtotalLines)}</span>
                    </div>
                    {totals.globalDiscountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>
                          Descuento global
                          {globalDiscountType === "percentage" && ` (${globalDiscount}%)`}
                        </span>
                        <span>-{formatCurrency(totals.globalDiscountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA</span>
                      <span>{formatCurrency(totals.taxAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-base">
                      <span>Total</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>

            {/* Terms (not for delivery notes) */}
            {!isDeliveryNote && (
              <div className="space-y-2">
                <Label>Términos y Condiciones</Label>
                <Textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Términos y condiciones..."
                  rows={3}
                />
              </div>
            )}

            {/* Convert/Duplicate actions (edit mode) */}
            {documentId && (onDuplicate || onConvert) && (
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {onDuplicate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`¿Duplicar este ${typeLabels[type].toLowerCase()}?`)) {
                        onDuplicate();
                      }
                    }}
                  >
                    <RiFileCopyLine className="mr-2 h-4 w-4" />
                    Duplicar
                  </Button>
                )}
                {onConvert && type !== "invoice" && type !== "credit_note" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`¿Convertir este ${typeLabels[type].toLowerCase()} a factura?`)) {
                        onConvert("invoice");
                      }
                    }}
                  >
                    <RiExchangeLine className="mr-2 h-4 w-4" />
                    Convertir a Factura
                  </Button>
                )}
                {onConvert && type !== "delivery_note" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`¿Convertir este ${typeLabels[type].toLowerCase()} a albarán?`)) {
                        onConvert("delivery_note");
                      }
                    }}
                  >
                    <RiTruckLine className="mr-2 h-4 w-4" />
                    Convertir a Albarán
                  </Button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleSubmit()}
                disabled={saving}
              >
                {saving ? (
                  <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RiSaveLine className="mr-2 h-4 w-4" />
                )}
                {documentId ? "Guardar cambios" : "Guardar"}
              </Button>
            </div>
            </div>
            </div>

            {/* Preview Section */}
            {showPreview && (
              <div className="w-1/2 overflow-hidden">
                <LiveDocumentPreview data={previewData} />
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
