"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiFileTextLine,
  RiImageLine,
  RiLinkM,
  RiDownloadLine,
  RiMoneyDollarCircleLine,
  RiVideoLine,
  RiCalendarEventLine,
  RiTimeLine,
  RiCalendarLine,
  RiArrowDownSLine,
  RiEditLine,
  RiAttachmentLine,
  RiMoreLine,
  RiFileDownloadLine,
  RiEyeLine,
} from "@remixicon/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useFileUpload } from "@/hooks/use-file-upload";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/ui/file-uploader";
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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { FilePreviewDialog } from "@/components/ui/file-preview-dialog";

interface TaskDetail {
  id: number;
  dueDate: string | null;
}

interface TaskAttachment {
  id: number;
  taskId: number;
  type: string;
  name: string;
  url: string;
  thumbnail: string | null;
  size: number | null;
  mimeType: string | null;
  uploadedAt: string;
}

interface TaskPayment {
  id: number;
  taskId: number;
  description: string;
  amount: string;
  date: string;
  status: string | null;
  vendorId: number | null;
  paymentMethod: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  vendorName: string | null;
  vendorCategory: string | null;
  vendorEmail: string | null;
  vendorPhone: string | null;
  vendorAddress: string | null;
}

interface Vendor {
  id: number;
  name: string;
  category: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface TaskScheduleItem {
  id: number;
  taskId: number;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  sortOrder: number;
}

interface UnifiedPayment {
  id: number;
  documentId: number | null;
  taskId: number | null;
  vendorId: number | null;
  contactId: number | null;
  eventId: number | null;
  amount: string;
  currency: string;
  direction: string;
  paymentDate: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  status: string | null;
  documentNumber?: string | null;
  documentType?: string | null;
  contactName?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  source: "unified";
}

interface FinancialDocument {
  id: number;
  type: string;
  number: string;
  total: string;
  status: string;
  companyName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
}

interface TaskInfoTabProps {
  task: TaskDetail | null;
  attachments: TaskAttachment[];
  payments: TaskPayment[];
  unifiedPayments: UnifiedPayment[];
  meetings: TaskScheduleItem[];
  loading: boolean;
  readOnly?: boolean;
  onUpdateTask: (updates: Record<string, unknown>) => Promise<unknown>;
  onAddAttachment: (data: { name: string; url: string; type?: string }) => Promise<unknown>;
  onDeleteAttachment: (attachmentId: number) => Promise<boolean>;
  onAddPayment: (data: { amount: number; date?: string; vendorId?: number; contactId?: number; paymentMethod?: string; notes?: string; direction?: string; status?: string; documentId?: number; attachmentUrl?: string; attachmentName?: string }) => Promise<unknown>;
  onUpdatePayment: (paymentId: number, data: { amount?: number; paymentMethod?: string; paymentDate?: Date; reference?: string; notes?: string; attachmentUrl?: string; attachmentName?: string }) => Promise<unknown>;
  onDeletePayment: (paymentId: number) => Promise<boolean>;
  onDeleteLegacyPayment: (paymentId: number) => Promise<boolean>;
  onAddMeeting: (data: { title: string; date: string; startTime?: string; endTime?: string; description?: string }) => Promise<unknown>;
  onDeleteMeeting: (meetingId: number) => Promise<boolean>;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskInfoTab({
  task,
  attachments,
  payments,
  unifiedPayments,
  meetings,
  loading,
  onUpdateTask,
  onAddAttachment,
  onDeleteAttachment,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  onDeleteLegacyPayment,
  onAddMeeting,
  onDeleteMeeting,
  readOnly = false,
}: TaskInfoTabProps) {
  const [attachmentTab, setAttachmentTab] = useState("files");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkName, setNewLinkName] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [newPayment, setNewPayment] = useState({ 
    amount: "", 
    date: "",
    vendorId: null as number | null,
    paymentMethod: "",
    notes: "",
    direction: "outgoing",
    status: "complete",
    documentId: null as number | null,
    attachmentUrl: "",
    attachmentName: "",
  });
  const [addingPayment, setAddingPayment] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState<number | null>(null);
  const [concilDocs, setConcilDocs] = useState<FinancialDocument[]>([]);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [newFile, setNewFile] = useState({ name: "", url: "", type: "file" });
  const [addingFile, setAddingFile] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<TaskAttachment[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: "", date: "", startTime: "", endTime: "", description: "" });
  const [addingMeeting, setAddingMeeting] = useState(false);
  const [expandedMeetings, setExpandedMeetings] = useState<Set<number>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { upload: uploadReceipt, uploading: receiptUploading } = useFileUpload({ folder: "payments" });

  const fetchVendors = async (search?: string) => {
    setLoadingVendors(true);
    try {
      const url = search ? `/api/vendors?search=${encodeURIComponent(search)}` : "/api/vendors";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setVendors(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
    } finally {
      setLoadingVendors(false);
    }
  };

  const fetchConcilDocs = async () => {
    try {
      const [invRes, quoteRes] = await Promise.all([
        fetch("/api/finance/documents?type=invoice&limit=100"),
        fetch("/api/finance/documents?type=quote&limit=100"),
      ]);
      const docs: FinancialDocument[] = [];
      if (invRes.ok) {
        const data = await invRes.json();
        if (data.success && data.data) {
          docs.push(...data.data.filter((d: FinancialDocument) => d.status === "sent" || d.status === "partial"));
        }
      }
      if (quoteRes.ok) {
        const data = await quoteRes.json();
        if (data.success && data.data) {
          docs.push(...data.data.filter((d: FinancialDocument) => d.status === "payment_promise"));
        }
      }
      setConcilDocs(docs);
    } catch {
      console.error("Failed to fetch conciliation docs");
    }
  };

  const handleOpenPaymentDialog = () => {
    setShowPaymentDialog(true);
    fetchVendors();
    fetchConcilDocs();
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadReceipt(file);
      if (result) {
        setNewPayment((prev) => ({ ...prev, attachmentUrl: result.url, attachmentName: file.name }));
        toast.success("Comprobante adjuntado");
      }
    } catch {
      toast.error("Error al subir comprobante");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount) return;
    setAddingPayment(true);
    try {
      await onAddPayment({
        amount: parseFloat(newPayment.amount),
        date: newPayment.date || new Date().toISOString().split("T")[0],
        vendorId: newPayment.vendorId || undefined,
        paymentMethod: newPayment.paymentMethod || undefined,
        notes: newPayment.notes || undefined,
        direction: newPayment.direction,
        status: newPayment.status,
        documentId: newPayment.documentId || undefined,
        attachmentUrl: newPayment.attachmentUrl || undefined,
        attachmentName: newPayment.attachmentName || undefined,
      });
      setNewPayment({ amount: "", date: "", vendorId: null, paymentMethod: "", notes: "", direction: "outgoing", status: "complete", documentId: null, attachmentUrl: "", attachmentName: "" });
      setShowPaymentDialog(false);
      toast.success("Pago registrado");
    } finally {
      setAddingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm("¿Eliminar este pago?")) return;
    await onDeletePayment(paymentId);
    toast.success("Pago eliminado");
  };

  const handleDeleteLegacyPayment = async (paymentId: number) => {
    if (!confirm("¿Eliminar este pago histórico?")) return;
    await onDeleteLegacyPayment(paymentId);
  };

  const handleAddFile = async () => {
    if (!newFile.name || !newFile.url) return;
    setAddingFile(true);
    try {
      await onAddAttachment({
        name: newFile.name,
        url: newFile.url,
        type: newFile.type,
      });
      setNewFile({ name: "", url: "", type: "file" });
      setShowFileDialog(false);
    } finally {
      setAddingFile(false);
    }
  };

  // Filter attachments by type (with defensive check)
  const safeAttachments = attachments || [];
  const safePayments = payments || [];
  const safeMeetings = meetings || [];
  const files = safeAttachments.filter((a) => a.type === "file" || a.type === "document");
  const images = safeAttachments.filter((a) => a.type === "image" || a.mimeType?.startsWith("image/"));
  const links = safeAttachments.filter((a) => a.type === "link");

  const handleAddMeeting = async () => {
    if (!newMeeting.title.trim() || !newMeeting.date) return;
    setAddingMeeting(true);
    try {
      await onAddMeeting({
        title: newMeeting.title.trim(),
        date: newMeeting.date,
        startTime: newMeeting.startTime || undefined,
        endTime: newMeeting.endTime || undefined,
        description: newMeeting.description.trim() || undefined,
      });
      setNewMeeting({ title: "", date: "", startTime: "", endTime: "", description: "" });
      setShowMeetingForm(false);
    } finally {
      setAddingMeeting(false);
    }
  };

  const toggleMeetingExpanded = (id: number) => {
    const newExpanded = new Set(expandedMeetings);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedMeetings(newExpanded);
  };

  const formatMeetingDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleAddLink = async () => {
    if (!newLinkUrl.trim()) return;
    setAddingLink(true);
    try {
      await onAddAttachment({
        name: newLinkName.trim() || newLinkUrl.trim(),
        url: newLinkUrl.trim(),
        type: "link",
      });
      setNewLinkUrl("");
      setNewLinkName("");
    } finally {
      setAddingLink(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Payments Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <RiMoneyDollarCircleLine className="h-4 w-4 text-muted-foreground" />
            Pagos
          </h3>
          {!readOnly && (
          <Button variant="outline" size="sm" className="gap-1" onClick={handleOpenPaymentDialog}>
            <RiAddLine className="h-4 w-4" />
            Agregar Pago
          </Button>
          )}
          <Sheet open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <SheetContent className="sm:max-w-3xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Registrar Pago</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 px-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Importe *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Select value={newPayment.direction} onValueChange={(v) => setNewPayment({ ...newPayment, direction: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outgoing">Pago (salida)</SelectItem>
                        <SelectItem value="incoming">Cobro (entrada)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={newPayment.date}
                      onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Método de Pago</Label>
                    <Select value={newPayment.paymentMethod} onValueChange={(v) => setNewPayment({ ...newPayment, paymentMethod: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Transferencia</SelectItem>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="card">Tarjeta</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={newPayment.status} onValueChange={(v) => setNewPayment({ ...newPayment, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="complete">Completado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={newPayment.vendorId || ""}
                    onChange={(e) => setNewPayment({ ...newPayment, vendorId: e.target.value ? parseInt(e.target.value) : null })}
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} {vendor.category ? `(${vendor.category})` : ""}
                      </option>
                    ))}
                  </select>
                  {loadingVendors && <p className="text-xs text-muted-foreground">Cargando proveedores...</p>}
                </div>

                <div className="space-y-2">
                  <Label>Conciliar con documento</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={newPayment.documentId || ""}
                    onChange={(e) => setNewPayment({ ...newPayment, documentId: e.target.value ? parseInt(e.target.value) : null })}
                  >
                    <option value="">Sin conciliar</option>
                    {concilDocs.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.type === "invoice" ? "Factura" : "Presupuesto"} {doc.number} — {parseFloat(doc.total).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                        {doc.status === "payment_promise" ? " (Promesa de pago)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    placeholder="Observaciones adicionales..."
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Adjuntar comprobante</Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleReceiptUpload}
                    className="hidden"
                    accept="image/*,.pdf"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={receiptUploading}
                    >
                      <RiAttachmentLine className="h-4 w-4 mr-1" />
                      {receiptUploading ? "Subiendo..." : "Seleccionar archivo"}
                    </Button>
                    {newPayment.attachmentName && (
                      <span className="text-xs text-muted-foreground truncate">{newPayment.attachmentName}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddPayment} disabled={addingPayment || !newPayment.amount}>
                    {addingPayment ? "Guardando..." : "Registrar Pago"}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        {/* Unified Payments */}
        <div className="rounded-lg border border-border">
          <div className="grid grid-cols-5 gap-4 p-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
            <span>Documento</span>
            <span>Dirección</span>
            <span>Fecha</span>
            <span>Importe</span>
            <span></span>
          </div>
          {(unifiedPayments || []).length === 0 && safePayments.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No hay pagos registrados
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(unifiedPayments || []).map((payment) => (
                <div key={`u-${payment.id}`} className="grid grid-cols-5 gap-4 p-3 items-center">
                  <div>
                    {payment.documentNumber ? (
                      <div>
                        <span className="text-sm font-medium">
                          {payment.documentType === "invoice" ? "Factura" : "Presupuesto"} {payment.documentNumber}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin documento</span>
                    )}
                    {payment.paymentMethod && (
                      <span className="text-xs text-muted-foreground block capitalize">
                        {payment.paymentMethod.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  <div>
                    <Badge variant="outline" className={payment.direction === "incoming" ? "text-emerald-600 border-emerald-200" : "text-red-600 border-red-200"}>
                      {payment.direction === "incoming" ? "Cobro" : "Pago"}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(payment.paymentDate).toLocaleDateString("es-ES")}
                  </span>
                  <span className="text-sm font-medium">
                    {parseFloat(payment.amount).toLocaleString("es-ES", { style: "currency", currency: payment.currency || "EUR" })}
                  </span>
                  <div className="flex items-center gap-1 justify-end">
                    {payment.attachmentUrl && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={payment.attachmentUrl} target="_blank" rel="noopener noreferrer">
                          <RiFileDownloadLine className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDeletePayment(payment.id)}
                    >
                      <RiDeleteBinLine className="h-3.5 w-3.5" />
                    </Button>
                    )}
                  </div>
                </div>
              ))}
              {/* Legacy payments */}
              {safePayments.map((payment) => (
                <div key={`l-${payment.id}`} className="grid grid-cols-5 gap-4 p-3 items-center opacity-70">
                  <div>
                    <span className="text-sm">{payment.description}</span>
                    <span className="text-[10px] text-muted-foreground block">Pago histórico</span>
                  </div>
                  <div>
                    {payment.vendorName ? (
                      <span className="text-sm">{payment.vendorName}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(payment.date).toLocaleDateString("es-ES")}
                  </span>
                  <span className="text-sm font-medium">${parseFloat(payment.amount).toLocaleString()}</span>
                  {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive justify-self-end"
                    onClick={() => handleDeleteLegacyPayment(payment.id)}
                  >
                    <RiDeleteBinLine className="h-3.5 w-3.5" />
                  </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meetings Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <RiCalendarEventLine className="h-4 w-4 text-muted-foreground" />
            Meetings
          </h3>
          {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setShowMeetingForm(!showMeetingForm)}
          >
            <RiAddLine className="h-4 w-4" />
            Add Meeting
          </Button>
          )}
        </div>

        {/* Add Meeting Form */}
        {showMeetingForm && (
          <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Input
                placeholder="Descripción *"
                value={newMeeting.title}
                onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
              />
              <Input
                type="date"
                value={newMeeting.date}
                onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
              />
              <div className="flex gap-2">
                <Input
                  type="time"
                  placeholder="Inicio"
                  value={newMeeting.startTime}
                  onChange={(e) => setNewMeeting({ ...newMeeting, startTime: e.target.value })}
                />
                <Input
                  type="time"
                  placeholder="Fin"
                  value={newMeeting.endTime}
                  onChange={(e) => setNewMeeting({ ...newMeeting, endTime: e.target.value })}
                />
              </div>
            </div>
            <Textarea
              placeholder="Más detalles (opcional)"
              value={newMeeting.description}
              onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMeetingForm(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleAddMeeting}
                disabled={addingMeeting || !newMeeting.title.trim() || !newMeeting.date}
              >
                {addingMeeting ? "Añadiendo..." : "Añadir"}
              </Button>
            </div>
          </div>
        )}

        {/* Meetings List */}
        {safeMeetings.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            No hay meetings registrados
          </div>
        ) : (
          <div className="space-y-2">
            {safeMeetings.map((meeting) => (
              <Collapsible
                key={meeting.id}
                open={expandedMeetings.has(meeting.id)}
                onOpenChange={() => toggleMeetingExpanded(meeting.id)}
              >
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center gap-4 p-4 bg-background">
                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Descripción</p>
                          <p className="font-medium">{meeting.title}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <RiCalendarLine className="h-3 w-3" />
                            Fecha
                          </p>
                          <p className="font-medium">{formatMeetingDate(meeting.date)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <RiTimeLine className="h-3 w-3" />
                            Hora
                          </p>
                          <p className="font-medium">
                            {meeting.startTime || "--:--"}
                            {meeting.endTime && ` - ${meeting.endTime}`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs">
                          {expandedMeetings.has(meeting.id) ? "Cerrar detalles" : "Más detalles"}
                          <RiArrowDownSLine
                            className={`h-4 w-4 ml-1 transition-transform ${
                              expandedMeetings.has(meeting.id) ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onDeleteMeeting(meeting.id)}
                      >
                        <RiDeleteBinLine className="h-4 w-4" />
                      </Button>
                      )}
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="p-4 border-t border-border bg-muted/30">
                      {meeting.description ? (
                        <p className="text-sm whitespace-pre-wrap">{meeting.description}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Sin descripción adicional
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        {!readOnly && safeMeetings.length > 0 && (
          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => {
                if (confirm("¿Eliminar todos los meetings?")) {
                  safeMeetings.forEach((m) => onDeleteMeeting(m.id));
                }
              }}
            >
              Remove Meeting
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMeetingForm(true)}
            >
              Add Meeting
            </Button>
          </div>
        )}
      </div>

      {/* Attachments Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Archivos</h3>
          {!readOnly && (
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowFileDialog(true)}>
            <RiAddLine className="h-4 w-4" />
            Subir Archivo
          </Button>
          )}
          <Sheet open={showFileDialog} onOpenChange={setShowFileDialog}>
            <SheetContent className="sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Subir Archivo</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 px-4 py-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    El archivo se guarda automáticamente al subirlo.
                  </p>
                  <FileUploader
                    folder="task-attachments"
                    onUpload={async (result) => {
                      await onAddAttachment({
                        name: result.name,
                        url: result.url,
                        type: result.type,
                      });
                      toast.success("Archivo guardado correctamente");
                      setShowFileDialog(false);
                    }}
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">o pega un enlace externo</span>
                  </div>
                </div>
                <div className="rounded-lg border border-dashed p-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Nombre del enlace</Label>
                    <Input
                      placeholder="Ej: Contrato firmado.pdf"
                      value={newFile.name}
                      onChange={(e) => setNewFile({ ...newFile, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      placeholder="https://drive.google.com/..."
                      value={newFile.url}
                      onChange={(e) => setNewFile({ ...newFile, url: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setShowFileDialog(false); setNewFile({ name: "", url: "", type: "link" }); }}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleAddFile} disabled={addingFile || !newFile.name || !newFile.url}>
                      {addingFile ? "Guardando..." : "Guardar enlace"}
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <Tabs value={attachmentTab} onValueChange={setAttachmentTab}>
          <TabsList>
            <TabsTrigger value="files" className="gap-1">
              <RiFileTextLine className="h-4 w-4" />
              Archivos ({files.length})
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-1">
              <RiImageLine className="h-4 w-4" />
              Imágenes ({images.length})
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-1">
              <RiLinkM className="h-4 w-4" />
              Enlaces ({links.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="mt-4">
            {files.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No hay archivos
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file, idx) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border group cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => { setPreviewFiles(files); setPreviewIndex(idx); setPreviewOpen(true); }}
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <RiFileTextLine className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setPreviewFiles(files); setPreviewIndex(idx); setPreviewOpen(true); }}
                        title="Vista previa"
                      >
                        <RiEyeLine className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" download>
                          <RiDownloadLine className="h-4 w-4" />
                        </a>
                      </Button>
                      {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onDeleteAttachment(file.id)}
                      >
                        <RiDeleteBinLine className="h-4 w-4" />
                      </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="images" className="mt-4">
            {images.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No hay imágenes
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {images.map((image, idx) => (
                  <div
                    key={image.id}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border group cursor-pointer"
                    onClick={() => { setPreviewFiles(images); setPreviewIndex(idx); setPreviewOpen(true); }}
                  >
                    <img
                      src={image.thumbnail || image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); setPreviewFiles(images); setPreviewIndex(idx); setPreviewOpen(true); }}
                      >
                        <RiEyeLine className="h-4 w-4" />
                      </Button>
                      <Button variant="secondary" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()} asChild>
                        <a href={image.url} target="_blank" rel="noopener noreferrer" download>
                          <RiDownloadLine className="h-4 w-4" />
                        </a>
                      </Button>
                      {!readOnly && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); onDeleteAttachment(image.id); }}
                      >
                        <RiDeleteBinLine className="h-4 w-4" />
                      </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="links" className="mt-4 space-y-4">
            {/* Add link form */}
            {!readOnly && (
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del enlace"
                value={newLinkName}
                onChange={(e) => setNewLinkName(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="https://..."
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleAddLink}
                disabled={addingLink || !newLinkUrl.trim()}
              >
                {addingLink ? "..." : "Añadir"}
              </Button>
            </div>
            )}

            {links.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No hay enlaces
              </div>
            ) : (
              <div className="space-y-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <RiLinkM className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{link.name}</p>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline truncate block"
                      >
                        {link.url}
                      </a>
                    </div>
                    {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onDeleteAttachment(link.id)}
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                    </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <FilePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        files={previewFiles}
        currentIndex={previewIndex}
        onIndexChange={setPreviewIndex}
      />
    </div>
  );
}
