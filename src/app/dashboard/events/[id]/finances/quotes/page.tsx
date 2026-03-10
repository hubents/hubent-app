"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadDocumentPDF } from "@/lib/pdf-download";
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
  RiCheckLine,
  RiFileTextLine,
  RiMoreLine,
  RiEditLine,
  RiEyeLine,
  RiDeleteBinLine,
  RiFileDownloadLine,
  RiExchangeLine,
  RiCloseLine,
  RiHandCoinLine,
  RiMoneyDollarCircleLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DocumentDrawer } from "@/components/finance/document-drawer";
import { DocumentPreview } from "@/components/finance/document-preview";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { EventSectionGuard } from "@/components/events/event-section-guard";

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

const quoteStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  sent: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Aceptado", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-700" },
  payment_promise: { label: "Promesa de pago", color: "bg-amber-100 text-amber-700" },
};

export default function EventQuotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { setActiveEvent } = useEvent();
  const { eventScoped } = useUserSessionContext();
  const { canEdit } = useEventPermissions(eventId, eventScoped);
  const canEditFinances = canEdit("finances");

  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<FinDoc[]>([]);

  // Document drawer/preview state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<number | undefined>(undefined);
  const [drawerType, setDrawerType] = useState<"quote" | "invoice" | "delivery_note">("quote");
  const [drawerInitialData, setDrawerInitialData] = useState<any>(undefined);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const formatCurrencyStr = useCallback((amount: string, cur = "EUR") => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(parseFloat(amount || "0"));
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/finance/documents?type=quote&eventId=${eventId}&limit=100`);
      const data = await res.json();
      if (data.success) {
        setQuotes(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
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
    setDrawerType("quote");
    setDrawerOpen(true);
  }

  function openEditDoc(docId: number) {
    setEditingDocId(docId);
    setDrawerInitialData(undefined);
    setDrawerType("quote");
    setDrawerOpen(true);
  }

  async function openPreview(docId: number) {
    try {
      const res = await fetch(`/api/finance/documents/${docId}`);
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
        toast.success(`Estado actualizado a ${quoteStatusConfig[status]?.label || status}`);
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
    if (!confirm("¿Estás seguro de eliminar este presupuesto?")) return;
    try {
      const res = await fetch(`/api/finance/documents/${docId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Presupuesto eliminado");
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
      const res = await fetch(`/api/finance/documents/${docId}`);
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
              taxRate: parseFloat(item.taxRate || "21"),
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
          <h1 className="text-2xl font-bold">Presupuestos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {quotes.length} presupuesto{quotes.length !== 1 ? "s" : ""} del evento
          </p>
        </div>
        {canEditFinances && (
        <Button onClick={openNewDoc}>
          <RiAddLine className="mr-2 h-4 w-4" /> Nuevo Presupuesto
        </Button>
        )}
      </div>

      {/* Table */}
      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <RiFileTextLine className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Sin presupuestos aún</p>
            <p className="text-sm mt-1">Crea uno para empezar a gestionar las finanzas del evento.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente / Proveedor</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((doc) => {
                  const st = quoteStatusConfig[doc.status] || quoteStatusConfig.sent || { label: doc.status, color: "bg-gray-100 text-gray-700" };
                  const isIncoming = doc.direction === "incoming";
                  return (
                    <TableRow
                      key={doc.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openEditDoc(doc.id)}
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
                            <Badge variant="outline" className="text-xs">Recibido</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{doc.number}</TableCell>
                      <TableCell>
                        {(() => {
                          const total = parseFloat(doc.total || "0");
                          const paid = parseFloat(doc.paidAmount || "0");
                          if (paid <= 0) return <span className="text-muted-foreground">-</span>;
                          const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
                          return (
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{pct.toFixed(0)}%</span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {formatCurrencyStr(doc.total, doc.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={st.color}>{st.label}</Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <RiMoreLine className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEditFinances && doc.status === "sent" && (
                              <>
                                <DropdownMenuItem onClick={() => updateDocStatus(doc.id, "accepted")}>
                                  <RiCheckLine className="mr-2 h-4 w-4" /> Aceptar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateDocStatus(doc.id, "rejected")}>
                                  <RiCloseLine className="mr-2 h-4 w-4" /> Rechazar
                                </DropdownMenuItem>
                              </>
                            )}
                            {canEditFinances && doc.status === "accepted" && (
                              <>
                                <DropdownMenuItem onClick={() => updateDocStatus(doc.id, "payment_promise")}>
                                  <RiHandCoinLine className="mr-2 h-4 w-4" /> Promesa de pago
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateDocStatus(doc.id, "sent")}>
                                  <RiCheckLine className="mr-2 h-4 w-4" /> Volver a Pendiente
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => fetchDocAndConvert(doc.id, "invoice")}>
                                  <RiExchangeLine className="mr-2 h-4 w-4" /> Convertir a Factura
                                </DropdownMenuItem>
                              </>
                            )}
                            {canEditFinances && doc.status === "rejected" && (
                              <>
                                <DropdownMenuItem onClick={() => updateDocStatus(doc.id, "sent")}>
                                  <RiCheckLine className="mr-2 h-4 w-4" /> Volver a Pendiente
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateDocStatus(doc.id, "accepted")}>
                                  <RiCheckLine className="mr-2 h-4 w-4" /> Aceptar
                                </DropdownMenuItem>
                              </>
                            )}
                            {canEditFinances && doc.status === "payment_promise" && (
                              <>
                                <DropdownMenuItem onClick={() => openPreview(doc.id)}>
                                  <RiMoneyDollarCircleLine className="mr-2 h-4 w-4" /> Registrar Pago
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateDocStatus(doc.id, "accepted")}>
                                  <RiCheckLine className="mr-2 h-4 w-4" /> Volver a Aceptado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateDocStatus(doc.id, "sent")}>
                                  <RiCheckLine className="mr-2 h-4 w-4" /> Volver a Pendiente
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => fetchDocAndConvert(doc.id, "invoice")}>
                                  <RiExchangeLine className="mr-2 h-4 w-4" /> Convertir a Factura
                                </DropdownMenuItem>
                              </>
                            )}
                            {canEditFinances && <DropdownMenuSeparator />}
                            {canEditFinances && (
                            <DropdownMenuItem onClick={() => openEditDoc(doc.id)}>
                              <RiEditLine className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openPreview(doc.id)}>
                              <RiEyeLine className="mr-2 h-4 w-4" /> Vista previa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadDocumentPDF(doc.id, `quote-${doc.number}.pdf`)}>
                              <RiFileDownloadLine className="mr-2 h-4 w-4" /> Descargar PDF
                            </DropdownMenuItem>
                            {canEditFinances && (doc.status === "sent" || doc.status === "rejected" || doc.status === "draft") && (
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
          </CardContent>
        </Card>
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
        onEdit={() => {
          setPreviewOpen(false);
          if (previewDoc) openEditDoc(previewDoc.id);
        }}
        onRefresh={() => fetchDocuments()}
      />
    </div>
    </EventSectionGuard>
  );
}
