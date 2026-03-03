"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { useEvent } from "@/contexts/event-context";
import { useFileUpload } from "@/hooks/use-file-upload";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RiMoneyDollarCircleLine,
  RiAddLine,
  RiCheckLine,
  RiTimeLine,
  RiListCheck,
  RiCalendarLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiAttachmentLine,
  RiFileDownloadLine,
  RiCloseLine,
  RiLoader4Line,
  RiFileTextLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Payment {
  id: number;
  description: string;
  amount: string;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
  paidTo: string | null;
  paidBy: string | null;
  vendorName: string | null;
  taskTitle: string | null;
  source?: string;
  paymentMethod?: string | null;
  reference?: string | null;
  documentNumber?: string | null;
  attachmentUrl?: string | null;
}

interface EventDocument {
  id: number;
  type: string;
  number: string;
  total: string;
  status: string;
}

const paymentStatusConfig: Record<string, { label: string; color: string; icon: typeof RiCheckLine }> = {
  paid: { label: "Pagado", color: "bg-green-100 text-green-700", icon: RiCheckLine },
  complete: { label: "Pagado", color: "bg-green-100 text-green-700", icon: RiCheckLine },
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700", icon: RiTimeLine },
};

export default function EventPaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { setActiveEvent } = useEvent();

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [eventDocs, setEventDocs] = useState<EventDocument[]>([]);
  const [currency, setCurrency] = useState("EUR");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);

  const defaultForm = {
    description: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "bank_transfer",
    reference: "",
    status: "complete",
    documentId: "",
    attachmentUrl: "",
    attachmentName: "",
  };
  const [newPayment, setNewPayment] = useState(defaultForm);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload: uploadFile, uploading: fileUploading } = useFileUpload({ folder: "payments" });

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount);
  }, [currency]);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/payments`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    }
  }, [eventId]);

  const fetchEventDocs = useCallback(async () => {
    try {
      const [invRes, quoteRes] = await Promise.all([
        fetch(`/api/finance/documents?type=invoice&eventId=${eventId}&limit=100`),
        fetch(`/api/finance/documents?type=quote&eventId=${eventId}&limit=100`),
      ]);
      const docs: EventDocument[] = [];
      if (invRes.ok) {
        const data = await invRes.json();
        if (data.success && data.data) {
          docs.push(...data.data.filter((d: EventDocument) => d.status === "sent" || d.status === "partial"));
        }
      }
      if (quoteRes.ok) {
        const data = await quoteRes.json();
        if (data.success && data.data) {
          docs.push(...data.data.filter((d: EventDocument) => d.status === "payment_promise"));
        }
      }
      setEventDocs(docs);
    } catch (error) {
      console.error("Failed to fetch event docs:", error);
    }
  }, [eventId]);

  useEffect(() => {
    async function fetchData() {
      try {
        const settingsRes = await fetch("/api/finance/settings");
        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.data?.defaultCurrency) {
          setCurrency(settingsData.data.defaultCurrency);
        }

        const eventRes = await fetch(`/api/events/${eventId}`);
        const eventData = await eventRes.json();
        if (eventData.success) {
          setActiveEvent(eventData.data);
        }

        await Promise.all([fetchPayments(), fetchEventDocs()]);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [eventId, setActiveEvent, fetchPayments, fetchEventDocs]);

  function resetAndClose() {
    setShowAddPayment(false);
    setEditingPaymentId(null);
    setNewPayment(defaultForm);
  }

  const handleAddPayment = async () => {
    if (!newPayment.amount) { toast.error("El monto es requerido"); return; }
    const effectiveStatus = parseFloat(newPayment.amount) > 0 ? "complete" : newPayment.status;
    try {
      const res = await fetch(`/api/events/${eventId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(newPayment.amount),
          notes: newPayment.description || null,
          paymentDate: newPayment.paymentDate ? new Date(newPayment.paymentDate) : new Date(),
          paymentMethod: newPayment.paymentMethod,
          reference: newPayment.reference || null,
          status: effectiveStatus,
          documentId: newPayment.documentId ? parseInt(newPayment.documentId) : null,
          attachmentUrl: newPayment.attachmentUrl || null,
          attachmentName: newPayment.attachmentName || null,
          direction: "outgoing",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Pago registrado");
        resetAndClose();
        fetchPayments();
        fetchEventDocs();
      } else {
        toast.error(data?.error?.message || "Error al registrar pago");
      }
    } catch {
      toast.error("Error al registrar pago");
    }
  };

  function openEditPayment(payment: Payment) {
    setEditingPaymentId(payment.id);
    setNewPayment({
      description: payment.description || "",
      amount: payment.amount,
      paymentDate: payment.paidDate ? String(payment.paidDate).split("T")[0] : (payment.dueDate ? String(payment.dueDate).split("T")[0] : new Date().toISOString().split("T")[0]),
      paymentMethod: payment.paymentMethod || "bank_transfer",
      reference: payment.reference || "",
      status: payment.status || "complete",
      documentId: "",
      attachmentUrl: payment.attachmentUrl || "",
      attachmentName: "",
    });
    setShowAddPayment(true);
  }

  async function handleUpdatePayment() {
    if (!editingPaymentId || !newPayment.amount) { toast.error("El monto es requerido"); return; }
    try {
      const res = await fetch(`/api/finance/payments/${editingPaymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(newPayment.amount),
          paymentMethod: newPayment.paymentMethod,
          paymentDate: new Date(newPayment.paymentDate),
          reference: newPayment.reference || null,
          notes: newPayment.description || null,
          attachmentUrl: newPayment.attachmentUrl || null,
          attachmentName: newPayment.attachmentName || null,
        }),
      });
      if (res.ok) {
        toast.success("Pago actualizado");
        resetAndClose();
        fetchPayments();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al actualizar pago");
      }
    } catch { toast.error("Error al actualizar pago"); }
  }

  async function deletePayment(id: number) {
    if (!confirm("¿Estás seguro de eliminar este pago?")) return;
    try {
      const res = await fetch(`/api/finance/payments/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Pago eliminado");
        fetchPayments();
        fetchEventDocs();
      } else {
        toast.error("Error al eliminar pago");
      }
    } catch { toast.error("Error al eliminar pago"); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      setNewPayment((prev) => ({ ...prev, attachmentUrl: result.url, attachmentName: result.name }));
      toast.success("Comprobante adjuntado");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDocumentSelect(docId: string) {
    setNewPayment((prev) => ({ ...prev, documentId: docId }));
    if (docId && docId !== "none") {
      const doc = eventDocs.find((d) => d.id.toString() === docId);
      if (doc) {
        setNewPayment((prev) => ({ ...prev, documentId: docId, amount: doc.total }));
      }
    }
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { daysInMonth: lastDay.getDate(), startingDay: firstDay.getDay() };
  };

  const getPaymentsForDay = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return payments.filter((p) => {
      if (!p.dueDate) return false;
      const d = new Date(p.dueDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - startingDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  const totalPaid = payments
    .filter((p) => p.status === "paid" || p.status === "complete")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {payments.length} pago{payments.length !== 1 ? "s" : ""} — {formatCurrency(totalPaid)} pagado, {formatCurrency(totalPending)} pendiente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary text-white" : "hover:bg-muted")}
            >
              <RiListCheck className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={cn("p-2 transition-colors", viewMode === "calendar" ? "bg-primary text-white" : "hover:bg-muted")}
            >
              <RiCalendarLine className="h-5 w-5" />
            </button>
          </div>
          <Button onClick={() => setShowAddPayment(true)}>
            <RiAddLine className="mr-2 h-4 w-4" /> Añadir pago
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "list" ? (
        <Card>
          <CardContent className="p-0">
            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-sm">
                      <th className="p-4 font-medium">Concepto</th>
                      <th className="p-4 font-medium">Fecha</th>
                      <th className="p-4 font-medium">Estado</th>
                      <th className="p-4 font-medium">Método</th>
                      <th className="p-4 font-medium text-right">Monto</th>
                      <th className="p-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payments.map((payment) => {
                      const status = paymentStatusConfig[payment.status] || paymentStatusConfig.pending;
                      return (
                        <tr key={payment.id} className="hover:bg-muted/30">
                          <td className="p-4">
                            <p className="font-medium">{payment.description}</p>
                            {payment.taskTitle && (
                              <p className="text-xs text-muted-foreground">{payment.taskTitle}</p>
                            )}
                          </td>
                          <td className="p-4 text-sm">
                            {payment.dueDate
                              ? new Date(payment.dueDate).toLocaleDateString("es-ES")
                              : payment.paidDate
                                ? new Date(payment.paidDate).toLocaleDateString("es-ES")
                                : "—"}
                          </td>
                          <td className="p-4">
                            <Badge className={status.color}>{status.label}</Badge>
                          </td>
                          <td className="p-4 text-sm capitalize">{payment.paymentMethod?.replace("_", " ") || payment.paidTo || "—"}</td>
                          <td className="p-4 text-right font-semibold">
                            {formatCurrency(parseFloat(payment.amount))}
                          </td>
                          <td className="p-4">
                            {payment.source === "unified" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <RiMoreLine className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditPayment(payment)}>
                                    <RiEditLine className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  {payment.attachmentUrl && (
                                    <DropdownMenuItem asChild>
                                      <a href={payment.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                        <RiFileDownloadLine className="mr-2 h-4 w-4" />
                                        Ver comprobante
                                      </a>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600" onClick={() => deletePayment(payment.id)}>
                                    <RiDeleteBinLine className="mr-2 h-4 w-4" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <RiMoneyDollarCircleLine className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Sin pagos aún</p>
                <p className="text-sm mt-1">Añade un pago para empezar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                  <RiArrowLeftSLine className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                  <RiArrowRightSLine className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>Hoy</Button>
              </div>
              <h3 className="text-lg font-medium">
                {currentMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
              </h3>
            </div>
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {["dom", "lun", "mar", "mié", "jue", "vie", "sáb"].map((day) => (
                <div key={day} className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground">{day}</div>
              ))}
              {calendarDays.map((day, index) => {
                const dayPayments = day ? getPaymentsForDay(day) : [];
                const isToday = day === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear();
                return (
                  <div key={index} className={cn("bg-card min-h-20 p-1", !day && "bg-muted/30")}>
                    {day && (
                      <>
                        <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-sm", isToday && "bg-primary text-white")}>{day}</span>
                        <div className="mt-1 space-y-1">
                          {dayPayments.slice(0, 2).map((p) => (
                            <div key={p.id} className={cn("text-xs p-1 rounded truncate", p.status === "paid" && "bg-green-100 text-green-700", p.status === "pending" && "bg-yellow-100 text-yellow-700", p.status === "overdue" && "bg-red-100 text-red-700")}>
                              {formatCurrency(parseFloat(p.amount))}
                            </div>
                          ))}
                          {dayPayments.length > 2 && <div className="text-xs text-muted-foreground">+{dayPayments.length - 2} más</div>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Payment Drawer */}
      <Sheet open={showAddPayment} onOpenChange={(open) => { if (!open) resetAndClose(); }}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingPaymentId ? "Editar pago" : "Registrar pago"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 py-4">
            {!editingPaymentId && eventDocs.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <RiFileTextLine className="h-4 w-4" />
                  Conciliar con documento (opcional)
                </Label>
                <Select
                  value={newPayment.documentId || "none"}
                  onValueChange={(v) => handleDocumentSelect(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar documento..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin documento</SelectItem>
                    {eventDocs.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id.toString()}>
                        {doc.type === "invoice" ? "Factura" : "Presupuesto (Promesa de pago)"} {doc.number} — {formatCurrency(parseFloat(doc.total))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input
                value={newPayment.description}
                onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                placeholder="Ej: Seña del salón"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={newPayment.paymentDate}
                  onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Método</Label>
                <Select
                  value={newPayment.paymentMethod}
                  onValueChange={(v) => setNewPayment({ ...newPayment, paymentMethod: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="bank_transfer">Transferencia</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={newPayment.status}
                  onValueChange={(value) => setNewPayment({ ...newPayment, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="complete">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Referencia</Label>
              <Input
                value={newPayment.reference}
                onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                placeholder="Nº transferencia, recibo, etc."
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <RiAttachmentLine className="h-4 w-4" />
                Comprobante (opcional)
              </Label>
              {newPayment.attachmentUrl ? (
                <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                  <RiFileDownloadLine className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={newPayment.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">
                    {newPayment.attachmentName || "Comprobante"}
                  </a>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setNewPayment((p) => ({ ...p, attachmentUrl: "", attachmentName: "" }))}>
                    <RiCloseLine className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                  <Button type="button" variant="outline" size="sm" disabled={fileUploading} onClick={() => fileInputRef.current?.click()}>
                    {fileUploading ? <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" /> : <RiAttachmentLine className="mr-2 h-4 w-4" />}
                    {fileUploading ? "Subiendo..." : "Adjuntar comprobante"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">PDF o imagen, máx. 10MB</p>
                </div>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
            <Button onClick={editingPaymentId ? handleUpdatePayment : handleAddPayment} disabled={!newPayment.amount}>
              {editingPaymentId ? "Guardar cambios" : "Registrar pago"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
