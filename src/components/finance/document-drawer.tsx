"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
} from "@remixicon/react";
import { toast } from "sonner";
import { LiveDocumentPreview, type OrganizationPreviewData } from "./live-document-preview";
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

interface Contact {
  id: number;
  name: string;
  email: string | null;
  type: string;
}

interface Vendor {
  id: number;
  name: string;
  email: string | null;
  category: string | null;
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

interface InitialDocumentData {
  contactId?: number;
  vendorId?: number;
  eventId?: number;
  notes?: string;
  termsAndConditions?: string;
  items?: DocumentItem[];
}

interface DocumentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: DocumentType;
  documentId?: number;
  initialData?: InitialDocumentData;
  onSuccess?: () => void;
}

const typeLabels: Record<DocumentType, string> = {
  quote: "Presupuesto",
  invoice: "Factura",
  proforma: "Proforma",
  delivery_note: "Albarán",
  credit_note: "Nota de Crédito",
};

export function DocumentDrawer({
  open,
  onOpenChange,
  type,
  documentId,
  initialData,
  onSuccess,
}: DocumentDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [contactId, setContactId] = useState<string>("");
  const [vendorId, setVendorId] = useState<string>("");
  const [eventId, setEventId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [items, setItems] = useState<DocumentItem[]>([
    { description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 21, total: 0 },
  ]);

  // Reference data
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);
  const [orgData, setOrgData] = useState<OrganizationPreviewData | undefined>();

  useEffect(() => {
    if (open) {
      fetchReferenceData();
      if (documentId) {
        fetchDocument();
      } else if (initialData) {
        // Pre-fill form with initial data (e.g., from quote conversion)
        setContactId(initialData.contactId?.toString() || "");
        setVendorId(initialData.vendorId?.toString() || "");
        setEventId(initialData.eventId?.toString() || "");
        setNotes(initialData.notes || "");
        setTermsAndConditions(initialData.termsAndConditions || "");
        if (initialData.items && initialData.items.length > 0) {
          setItems(initialData.items);
        }
      } else {
        resetForm();
      }
    }
  }, [open, documentId, initialData]);

  function resetForm() {
    setContactId("");
    setVendorId("");
    setEventId("");
    setDueDate("");
    setValidUntil("");
    setNotes("");
    setTermsAndConditions("");
    setItems([{ description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: defaultTaxRate, total: 0 }]);
  }

  async function fetchReferenceData() {
    try {
      const [contactsRes, vendorsRes, eventsRes, taxRatesRes, settingsRes] = await Promise.all([
        fetch("/api/contacts?limit=100"),
        fetch("/api/vendors?limit=100"),
        fetch("/api/events?limit=100"),
        fetch("/api/finance/tax-rates"),
        fetch("/api/finance/settings"),
      ]);

      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data.data || []);
      }

      if (vendorsRes.ok) {
        const data = await vendorsRes.json();
        setVendors(data.data || []);
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json();
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

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data.data?.defaultTermsAndConditions && !documentId) {
          setTermsAndConditions(data.data.defaultTermsAndConditions);
        }
        if (data.data?.quoteValidityDays && type === "quote" && !documentId) {
          const validDate = new Date();
          validDate.setDate(validDate.getDate() + data.data.quoteValidityDays);
          setValidUntil(validDate.toISOString().split("T")[0]);
        }
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
          setContactId(doc.contactId?.toString() || "");
          setEventId(doc.eventId?.toString() || "");
          setDueDate(doc.dueDate ? doc.dueDate.split("T")[0] : "");
          setValidUntil(doc.validUntil ? doc.validUntil.split("T")[0] : "");
          setNotes(doc.notes || "");
          setTermsAndConditions(doc.termsAndConditions || "");
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
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach((item) => {
      subtotal += item.total;
      taxAmount += item.total * (item.taxRate / 100);
    });

    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  }

  async function handleSubmit() {
    if (items.length === 0 || !items.some((item) => item.description.trim())) {
      toast.error("Agrega al menos un ítem con descripción");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type,
        contactId: contactId ? parseInt(contactId) : undefined,
        vendorId: vendorId ? parseInt(vendorId) : undefined,
        eventId: eventId ? parseInt(eventId) : undefined,
        dueDate: dueDate || undefined,
        validUntil: validUntil || undefined,
        notes: notes || undefined,
        termsAndConditions: termsAndConditions || undefined,
        items: items.filter((item) => item.description.trim()).map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
        })),
      };

      const url = documentId
        ? `/api/finance/documents/${documentId}`
        : "/api/finance/documents";
      const method = documentId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(documentId ? "Documento actualizado" : `${typeLabels[type]} creado`);
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

  // Build preview data
  const previewData = useMemo(() => {
    const selectedContact = contacts.find((c) => c.id.toString() === contactId);
    const selectedVendor = vendors.find((v) => v.id.toString() === vendorId);
    const selectedEvent = events.find((e) => e.id.toString() === eventId);

    return {
      type,
      contactName: selectedContact?.name,
      vendorName: selectedVendor?.name,
      eventName: selectedEvent?.name,
      items,
      notes,
      termsAndConditions,
      dueDate,
      validUntil,
      organization: orgData,
    };
  }, [type, contactId, vendorId, eventId, items, notes, termsAndConditions, dueDate, validUntil, contacts, vendors, events, orgData]);

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
          <div className={cn("flex-1 overflow-hidden", showPreview ? "flex" : "")}>
            {/* Form Section */}
            <div className={cn(
              "overflow-y-auto p-6",
              showPreview ? "w-1/2 border-r" : "w-full"
            )}>
            <div className="space-y-6">
            {/* Client / Vendor & Event */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente / Contacto</Label>
                <Select
                  value={contactId || "none"}
                  onValueChange={(v) => {
                    setContactId(v === "none" ? "" : v);
                    if (v !== "none") setVendorId(""); // Clear vendor if contact selected
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin cliente</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id.toString()}>
                        {contact.name}
                        {contact.email && ` (${contact.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Proveedor (para pagos)</Label>
                <Select
                  value={vendorId || "none"}
                  onValueChange={(v) => {
                    setVendorId(v === "none" ? "" : v);
                    if (v !== "none") setContactId(""); // Clear contact if vendor selected
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin proveedor</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                        {vendor.category && ` (${vendor.category})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Evento (opcional)</Label>
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
                      <TableHead className="min-w-[200px]">Descripción</TableHead>
                      <TableHead className="w-20">Cant.</TableHead>
                      <TableHead className="w-24">Precio</TableHead>
                      <TableHead className="w-20">Dto.%</TableHead>
                      <TableHead className="w-20">IVA%</TableHead>
                      <TableHead className="w-24 text-right">Total</TableHead>
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
                                  <SelectItem key={tax.id} value={tax.rate.toString()}>
                                    {tax.name} ({tax.rate}%)
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

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA</span>
                    <span>{formatCurrency(totals.taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>
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

            {/* Terms */}
            <div className="space-y-2">
              <Label>Términos y Condiciones</Label>
              <Textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Términos y condiciones..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RiSaveLine className="mr-2 h-4 w-4" />
                )}
                {saving ? "Guardando..." : documentId ? "Guardar Cambios" : `Crear ${typeLabels[type]}`}
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
