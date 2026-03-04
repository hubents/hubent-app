"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  RiSearchLine,
  RiTruckLine,
  RiMoreLine,
  RiEditLine,
  RiFileCopyLine,
  RiDeleteBinLine,
  RiSendPlaneLine,
  RiCheckLine,
  RiEyeLine,
  RiCheckDoubleLine,
  RiExchangeLine,
  RiFileDownloadLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DocumentDrawer } from "@/components/finance/document-drawer";
import { DocumentPreview } from "@/components/finance/document-preview";
import { downloadDocumentPDF } from "@/lib/pdf-download";
import { NumericPagination } from "@/components/ui/numeric-pagination";

interface DocumentItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  total: string;
}

interface DeliveryNote {
  id: number;
  type: string;
  number: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  validUntil: string | null;
  subtotal: string;
  taxAmount: string;
  total: string;
  currency: string;
  notes: string | null;
  termsAndConditions: string | null;
  companyName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  contactName: string | null;
  eventName: string | null;
  items: DocumentItem[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  approved: { label: "Aprobado", color: "bg-indigo-100 text-indigo-700" },
  sent: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  delivered: { label: "Entregado", color: "bg-green-100 text-green-700" },
};

export default function DeliveryNotesPage() {
  return (
    <Suspense>
      <DeliveryNotesContent />
    </Suspense>
  );
}

function DeliveryNotesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [drawerInitialData, setDrawerInitialData] = useState<any>(undefined);
  const [drawerType, setDrawerType] = useState<"delivery_note" | "invoice">("delivery_note");
  
  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewNote, setPreviewNote] = useState<DeliveryNote | null>(null);

  useEffect(() => {
    fetchNotes();
  }, [statusFilter, page]);

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      openNewDrawer();
      router.replace("/dashboard/finance/delivery-notes");
    }
  }, [searchParams]);

  async function fetchNotes() {
    try {
      const params = new URLSearchParams({
        type: "delivery_note",
        page: page.toString(),
        limit: "20",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/finance/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotes(data.data || []);
          setTotalPages(data.meta?.totalPages || 1);
        }
      }
    } catch (error) {
      console.error("Failed to fetch delivery notes:", error);
      toast.error("Error al cargar albaranes");
    } finally {
      setLoading(false);
    }
  }

  async function deleteNote(id: number) {
    if (!confirm("¿Estás seguro de eliminar este albarán?")) return;

    try {
      const res = await fetch(`/api/finance/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Albarán eliminado");
        fetchNotes();
      } else {
        toast.error("Error al eliminar");
      }
    } catch (error) {
      toast.error("Error al eliminar");
    }
  }

  async function fetchDocAndOpenDrawer(id: number, targetType: "delivery_note" | "invoice") {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const doc = data.data;
          const isDeliveryNote = targetType === "delivery_note";
          setDrawerInitialData({
            contactId: doc.contactId,
            vendorId: doc.vendorId,
            eventId: doc.eventId,
            notes: doc.notes,
            termsAndConditions: isDeliveryNote ? undefined : doc.termsAndConditions,
            globalDiscount: isDeliveryNote ? undefined : (parseFloat(doc.globalDiscount || "0") || undefined),
            globalDiscountType: isDeliveryNote ? undefined : doc.globalDiscountType,
            paymentMethod: isDeliveryNote ? undefined : doc.paymentMethod,
            bankAccountId: isDeliveryNote ? undefined : doc.bankAccountId,
            items: doc.items?.map((item: any) => ({
              description: item.description,
              quantity: parseFloat(item.quantity),
              unitPrice: isDeliveryNote ? 0 : parseFloat(item.unitPrice || "0"),
              discount: isDeliveryNote ? 0 : parseFloat(item.discount || "0"),
              taxRate: isDeliveryNote ? 0 : parseFloat(item.taxRate || "21"),
              total: isDeliveryNote ? 0 : parseFloat(item.total || "0"),
            })),
          });
          setDrawerType(targetType);
          setEditingId(undefined);
          setDrawerOpen(true);
        }
      }
    } catch (error) {
      toast.error("Error al cargar documento");
    }
  }

  async function updateStatus(id: number, status: string) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Estado actualizado a ${statusConfig[status]?.label || status}`);
        fetchNotes();
      } else {
        toast.error("Error al actualizar estado");
      }
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  }

  function openNewDrawer() {
    setEditingId(undefined);
    setDrawerInitialData(undefined);
    setDrawerOpen(true);
  }

  function openEditDrawer(id: number) {
    setEditingId(id);
    setDrawerInitialData(undefined);
    setDrawerOpen(true);
  }

  async function openPreview(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setPreviewNote(data.data);
          setPreviewOpen(true);
        }
      }
    } catch (error) {
      toast.error("Error al cargar documento");
    }
  }

  const getClientName = (note: DeliveryNote) => {
    if (note.contactName) return note.contactName;
    if (note.companyName) return note.companyName;
    if (note.personFirstName) {
      return `${note.personFirstName} ${note.personLastName || ""}`.trim();
    }
    return "Sin cliente";
  };

  function handleSearchSubmit() {
    setPage(1);
    fetchNotes();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Albaranes</h1>
          <p className="text-muted-foreground">
            Notas de entrega de productos y servicios
          </p>
        </div>
        <Button onClick={openNewDrawer}>
          <RiAddLine className="mr-2 h-4 w-4" />
          Nuevo Albarán
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="sent">Pendiente</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <RiTruckLine className="h-8 w-8" />
                      <p>No hay albaranes</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                notes.map((note: DeliveryNote) => (
                  <TableRow 
                    key={note.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEditDrawer(note.id)}
                  >
                    <TableCell>
                      {note.issueDate
                        ? format(new Date(note.issueDate), "dd MMM yyyy", { locale: es })
                        : "-"}
                    </TableCell>
                    <TableCell>{getClientName(note)}</TableCell>
                    <TableCell className="font-medium">
                      {note.number}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[note.status]?.color || "bg-gray-100"}>
                        {statusConfig[note.status]?.label || note.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <RiMoreLine className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDrawer(note.id)}>
                            <RiEditLine className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openPreview(note.id)}>
                            <RiEyeLine className="mr-2 h-4 w-4" />
                            Vista previa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(note.id, "delivery_note")}>
                            <RiFileCopyLine className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadDocumentPDF(note.id, `delivery-note-${note.number}.pdf`)}>
                            <RiFileDownloadLine className="mr-2 h-4 w-4" />
                            Descargar PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {note.status === "draft" && (
                            <>
                              <DropdownMenuItem onClick={() => updateStatus(note.id, "approved")}>
                                <RiCheckDoubleLine className="mr-2 h-4 w-4" />
                                Aprobar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(note.id, "sent")}>
                                <RiSendPlaneLine className="mr-2 h-4 w-4" />
                                Marcar como Pendiente
                              </DropdownMenuItem>
                            </>
                          )}
                          {note.status === "approved" && (
                            <DropdownMenuItem onClick={() => updateStatus(note.id, "sent")}>
                              <RiSendPlaneLine className="mr-2 h-4 w-4" />
                              Marcar como Pendiente
                            </DropdownMenuItem>
                          )}
                          {note.status === "sent" && (
                            <DropdownMenuItem onClick={() => updateStatus(note.id, "delivered")}>
                              <RiCheckLine className="mr-2 h-4 w-4" />
                              Marcar como Entregado
                            </DropdownMenuItem>
                          )}
                          {note.status !== "draft" && note.status !== "cancelled" && (
                            <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(note.id, "invoice")}>
                              <RiExchangeLine className="mr-2 h-4 w-4" />
                              Convertir a Factura
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteNote(note.id)}
                          >
                            <RiDeleteBinLine className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-center">
        <NumericPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* Document Drawer */}
      <DocumentDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) { setDrawerInitialData(undefined); setDrawerType("delivery_note"); }
        }}
        type={drawerType}
        documentId={editingId}
        initialData={drawerInitialData}
        onSuccess={fetchNotes}
        onDuplicate={() => {
          setDrawerOpen(false);
          if (editingId) fetchDocAndOpenDrawer(editingId, "delivery_note");
        }}
        onConvert={(targetType) => {
          setDrawerOpen(false);
          if (editingId) fetchDocAndOpenDrawer(editingId, targetType as "delivery_note" | "invoice");
        }}
      />

      {/* Document Preview */}
      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewNote}
        onEdit={() => {
          setPreviewOpen(false);
          if (previewNote) openEditDrawer(previewNote.id);
        }}
        onRefresh={fetchNotes}
      />
    </div>
  );
}
