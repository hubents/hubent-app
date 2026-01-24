"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  RiAddLine,
  RiDeleteBinLine,
  RiArrowLeftLine,
  RiSaveLine,
} from "@remixicon/react";
import { toast } from "sonner";

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
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  tradeName: string | null;
  type: string;
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
}

interface DocumentFormProps {
  type: DocumentType;
  documentId?: number;
  title: string;
  backUrl: string;
}

const typeLabels: Record<DocumentType, string> = {
  quote: "Presupuesto",
  invoice: "Factura",
  proforma: "Proforma",
  delivery_note: "Albarán",
  credit_note: "Nota de Crédito",
};

export function DocumentForm({ type, documentId, title, backUrl }: DocumentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [contactId, setContactId] = useState<string>("");
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
  const [events, setEvents] = useState<Event[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);

  useEffect(() => {
    fetchReferenceData();
    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  async function fetchReferenceData() {
    try {
      const [contactsRes, eventsRes, taxRatesRes, settingsRes] = await Promise.all([
        fetch("/api/contacts?limit=100"),
        fetch("/api/events?limit=100"),
        fetch("/api/finance/tax-rates"),
        fetch("/api/finance/settings"),
      ]);

      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data.data || []);
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
        if (data.data?.defaultTermsAndConditions) {
          setTermsAndConditions(data.data.defaultTermsAndConditions);
        }
        if (data.data?.quoteValidityDays && type === "quote") {
          const validDate = new Date();
          validDate.setDate(validDate.getDate() + data.data.quoteValidityDays);
          setValidUntil(validDate.toISOString().split("T")[0]);
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
        eventId: eventId ? parseInt(eventId) : undefined,
        dueDate: dueDate || undefined,
        validUntil: validUntil || undefined,
        notes: notes || undefined,
        termsAndConditions: termsAndConditions || undefined,
        items: items
          .filter((item) => item.description.trim())
          .map((item) => ({
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
        const data = await res.json();
        toast.success(documentId ? "Documento actualizado" : "Documento creado");
        router.push(`${backUrl}/${data.data?.id || ""}`);
      } else {
        const error = await res.json();
        toast.error(error.error?.message || "Error al guardar");
      }
    } catch (error) {
      toast.error("Error al guardar el documento");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(backUrl)}>
            <RiArrowLeftLine className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground">
              {documentId ? `Editando ${typeLabels[type].toLowerCase()}` : `Crear nuevo ${typeLabels[type].toLowerCase()}`}
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={saving}>
          <RiSaveLine className="mr-2 h-4 w-4" />
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client & Event */}
          <Card>
            <CardHeader>
              <CardTitle>Datos del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cliente / Contacto</Label>
                  <Select value={contactId} onValueChange={setContactId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin cliente</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id.toString()}>
                          {contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`.trim()}
                          {contact.email && ` (${contact.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Evento (opcional)</Label>
                  <Select value={eventId} onValueChange={setEventId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vincular a evento..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin evento</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id.toString()}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Líneas del {typeLabels[type]}</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem}>
                <RiAddLine className="mr-2 h-4 w-4" />
                Agregar línea
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Descripción</TableHead>
                    <TableHead className="w-[10%]">Cant.</TableHead>
                    <TableHead className="w-[15%]">Precio</TableHead>
                    <TableHead className="w-[10%]">Dto. %</TableHead>
                    <TableHead className="w-[10%]">IVA %</TableHead>
                    <TableHead className="w-[10%] text-right">Total</TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          placeholder="Descripción del producto o servicio"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount}
                          onChange={(e) => updateItem(index, "discount", e.target.value)}
                          className="w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.taxRate.toString()}
                          onValueChange={(v) => updateItem(index, "taxRate", v)}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="4">4%</SelectItem>
                            <SelectItem value="10">10%</SelectItem>
                            <SelectItem value="21">21%</SelectItem>
                            {taxRates.map((rate) => (
                              <SelectItem key={rate.id} value={rate.rate}>
                                {rate.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <RiDeleteBinLine className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notas y Términos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Notas (visibles en el documento)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Términos y Condiciones</Label>
                <Textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Términos y condiciones..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Totals */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA</span>
                <span>{formatCurrency(totals.taxAmount)}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={handleSubmit} disabled={saving}>
                <RiSaveLine className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar como borrador"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
