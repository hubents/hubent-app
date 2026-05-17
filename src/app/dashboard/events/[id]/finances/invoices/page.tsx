"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { Btn, Pill, PCard } from "@/components/ui/ds";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadPDFFromHTML } from "@/lib/pdf-download";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RiAddLine,
  RiFileList2Line,
  RiMoreLine,
  RiEditLine,
  RiEyeLine,
  RiDeleteBinLine,
  RiFileDownloadLine,
  RiMoneyDollarCircleLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DocumentDrawer } from "@/components/finance/document-drawer";
import { DocumentPreview } from "@/components/finance/document-preview";
import { PaymentDrawer } from "@/components/finance/payment-drawer";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { EventSectionGuard } from "@/components/events/event-section-guard";
import { appConfirm } from "@/lib/confirm";

interface FinDoc {
  id: number;
  type: string;
  number: string;
  status: string;
  contactId: number | null;
  vendorId: number | null;
  eventId: number | null;
  direction: string | null;
  issueDate: string;
  dueDate: string | null;
  validUntil: string | null;
  subtotal: string;
  taxAmount: string;
  total: string;
  paidAmount?: string | null;
  currency: string;
  globalDiscount: string | null;
  globalDiscountType: string | null;
  notes: string | null;
  termsAndConditions: string | null;
  contactName: string | null;
  vendorName: string | null;
  companyName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  eventName: string | null;
  sourceDocumentId?: number | null;
}

const invoiceStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  sent: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  partial: { label: "Parcial", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Pagada", color: "bg-green-100 text-green-700" },
  overdue: { label: "Vencida", color: "bg-orange-100 text-orange-700" },
};

export default function EventInvoicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { setActiveEvent } = useEvent();
  const { eventScoped } = useUserSessionContext();
  const { canEdit } = useEventPermissions(eventId, eventScoped);
  const canEditFinances = canEdit("finances");

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<FinDoc[]>([]);

  // Payment drawer state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<FinDoc | null>(null);

  // Document drawer/preview state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<number | undefined>(undefined);
  const [drawerType, setDrawerType] = useState<"quote" | "invoice" | "delivery_note">("invoice");
  const [drawerInitialData, setDrawerInitialData] = useState<any>(undefined);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const formatCurrencyStr = useCallback((amount: string, cur = "EUR") => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(parseFloat(amount || "0"));
  }, []);

  function isOverdue(doc: FinDoc): boolean {
    if (!doc.dueDate) return false;
    if (doc.status === "paid" || doc.status === "cancelled") return false;
    return new Date(doc.dueDate) < new Date();
  }

  function getDisplayStatus(doc: FinDoc): string {
    if (isOverdue(doc)) return "overdue";
    return doc.status;
  }

  function openPaymentDialog(doc: FinDoc) {
    setPaymentInvoice(doc);
    setPaymentDialogOpen(true);
  }

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/documents/finance?type=invoice&limit=100`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    }
  }, [eventId]);

  useEffect(() => {
    async function fetchData() {
      try {
        const eventRes = await fetch(`/api/events/${eventId}`);
        const eventData = await eventRes.json();
        if (eventData.success) {
          setActiveEvent(eventData.data);
        }
        await fetchDocuments();
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [eventId, setActiveEvent, fetchDocuments]);

  function openNewDoc() {
    setEditingDocId(undefined);
    setDrawerInitialData({ eventId });
    setDrawerType("invoice");
    setDrawerOpen(true);
  }

  function openEditDoc(docId: number) {
    setEditingDocId(docId);
    setDrawerInitialData(undefined);
    setDrawerType("invoice");
    setDrawerOpen(true);
  }

  async function openPreview(docId: number) {
    try {
      const res = await fetch(`/api/events/${eventId}/documents/finance/${docId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setPreviewDoc(data.data);
          setPreviewOpen(true);
        }
      }
    } catch {
      toast.error("Error al cargar documento");
    }
  }

  async function updateDocStatus(docId: number, status: string) {
    try {
      const res = await fetch(`/api/finance/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Estado actualizado a ${invoiceStatusConfig[status]?.label || status}`);
        fetchDocuments();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al actualizar estado");
      }
    } catch {
      toast.error("Error al actualizar estado");
    }
  }

  async function deleteDoc(docId: number) {
    if (!await appConfirm({ title: "Eliminar factura", description: "Esta acción no se puede deshacer.", variant: "destructive", confirmLabel: "Eliminar" })) return;
    try {
      const res = await fetch(`/api/finance/documents/${docId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Factura eliminada");
        fetchDocuments();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al eliminar");
      }
    } catch {
      toast.error("Error al eliminar");
    }
  }

  async function fetchDocAndConvert(docId: number, targetType: "quote" | "invoice" | "delivery_note") {
    try {
      const res = await fetch(`/api/events/${eventId}/documents/finance/${docId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const doc = data.data;
          setDrawerInitialData({
            contactId: doc.contactId,
            vendorId: doc.vendorId,
            eventId: doc.eventId || eventId,
            notes: doc.notes,
            termsAndConditions: doc.termsAndConditions,
            globalDiscount: parseFloat(doc.globalDiscount || "0") || undefined,
            globalDiscountType: doc.globalDiscountType,
            paymentMethod: doc.paymentMethod,
            bankAccountId: doc.bankAccountId,
            items: doc.items?.map((item: any) => ({
              description: item.description,
              quantity: parseFloat(item.quantity),
              unitPrice: parseFloat(item.unitPrice),
              discount: parseFloat(item.discount || "0"),
              taxRate: parseFloat(item.taxRate ?? "21"),
              total: parseFloat(item.total),
            })),
          });
          setDrawerType(targetType);
          setEditingDocId(undefined);
          setDrawerOpen(true);
        }
      }
    } catch {
      toast.error("Error al cargar documento");
    }
  }

  function getClientName(doc: FinDoc) {
    if (doc.contactName) return doc.contactName;
    if (doc.companyName) return doc.companyName;
    if (doc.personFirstName) return `${doc.personFirstName} ${doc.personLastName || ""}`.trim();
    if (doc.vendorName) return doc.vendorName;
    return "—";
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <EventSectionGuard eventId={eventId} section="finances">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Facturas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {invoices.length} factura{invoices.length !== 1 ? "s" : ""} del evento
          </p>
        </div>
        {canEditFinances && (
        <Btn variant="primary" onClick={openNewDoc}>
          <RiAddLine className="mr-2 h-4 w-4" /> Nueva Factura
        </Btn>
        )}
      </div>

      {/* Table */}
      {invoices.length === 0 ? (
        <PCard>
          <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--ink-3)" }}>
            <RiFileList2Line className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p style={{ fontWeight: 500, color: "var(--ink-1)" }}>Sin facturas aún</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Crea una para empezar a gestionar las finanzas del evento.</p>
          </div>
        </PCard>
      ) : (
        <PCard padding={0}>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente / Proveedor</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((doc) => {
                  const displayStatus = getDisplayStatus(doc);
                  const st = invoiceStatusConfig[displayStatus] || invoiceStatusConfig.sent || { label: doc.status, color: "bg-gray-100 text-gray-700" };
                  const isIncoming = doc.direction === "incoming";
                  return (
                    <TableRow
                      key={doc.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => !canEditFinances || doc.status === "paid" || doc.status === "partial" ? openPreview(doc.id) : openEditDoc(doc.id)}
                    >
                      <TableCell className="text-sm">
                        {doc.issueDate
                          ? format(new Date(doc.issueDate), "dd MMM yyyy", { locale: es })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{getClientName(doc)}</span>
                          {isIncoming && (
                            <Pill bg="transparent" style={{ border: "1px solid var(--line-strong)", fontSize: 11 }}>Recibido</Pill>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{doc.number}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {formatCurrencyStr(doc.total, doc.currency)}
                      </TableCell>
                      <TableCell>
                        <Pill bg="" color="" className={st.color}>{st.label}</Pill>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Btn variant="ghost" size="sm" style={{ width: 32, height: 32, padding: 0 }}>
                              <RiMoreLine className="h-4 w-4" />
                            </Btn>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEditFinances && doc.status !== "paid" && doc.status !== "partial" && (
                              <DropdownMenuItem onClick={() => openEditDoc(doc.id)}>
                                <RiEditLine className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                            )}
                            {canEditFinances && (doc.status === "sent" || doc.status === "partial") && (
                              <DropdownMenuItem onClick={() => openPaymentDialog(doc)}>
                                <RiMoneyDollarCircleLine className="mr-2 h-4 w-4" /> Registrar Pago
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openPreview(doc.id)}>
                              <RiEyeLine className="mr-2 h-4 w-4" /> Vista previa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadPDFFromHTML(`/api/events/${eventId}/documents/finance/${doc.id}/pdf?format=html`, `invoice-${doc.number}.pdf`)}>
                              <RiFileDownloadLine className="mr-2 h-4 w-4" /> Descargar PDF
                            </DropdownMenuItem>
                            {canEditFinances && doc.status !== "paid" && doc.status !== "partial" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => deleteDoc(doc.id)}>
                                  <RiDeleteBinLine className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        </PCard>
      )}

      {/* Payment Drawer */}
      {paymentInvoice && (
        <PaymentDrawer
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          onSuccess={() => {
            setPaymentDialogOpen(false);
            setPaymentInvoice(null);
            fetchDocuments();
          }}
          documentId={paymentInvoice.id}
          document={{
            number: paymentInvoice.number,
            total: paymentInvoice.total,
            paidAmount: paymentInvoice.paidAmount || "0",
            currency: paymentInvoice.currency,
            direction: paymentInvoice.direction,
          }}
          eventId={eventId}
          apiBasePath={`/api/events/${eventId}/payments`}
          showDirectionSelector={false}
        />
      )}

      {/* Document Drawer */}
      <DocumentDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) { setDrawerInitialData(undefined); setEditingDocId(undefined); }
        }}
        type={drawerType}
        documentId={editingDocId}
        initialData={drawerInitialData}
        onSuccess={() => fetchDocuments()}
        onDuplicate={() => {
          setDrawerOpen(false);
          if (editingDocId) fetchDocAndConvert(editingDocId, drawerType);
        }}
        onConvert={(targetType) => {
          setDrawerOpen(false);
          if (editingDocId) fetchDocAndConvert(editingDocId, targetType as "quote" | "invoice" | "delivery_note");
        }}
      />

      {/* Document Preview */}
      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDoc}
        onEdit={canEditFinances ? () => {
          setPreviewOpen(false);
          if (previewDoc) openEditDoc(previewDoc.id);
        } : undefined}
        onRefresh={() => fetchDocuments()}
        readOnly={!canEditFinances}
        pdfUrl={previewDoc ? `/api/events/${eventId}/documents/finance/${previewDoc.id}/pdf?format=html` : undefined}
      />
    </div>
    </EventSectionGuard>
  );
}
