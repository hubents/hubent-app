"use client";

import { useState } from "react";
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
} from "@remixicon/react";
import { FileUploader } from "@/components/ui/file-uploader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
  createdBy: string | null;
  createdAt: string;
}

interface TaskInfoTabProps {
  task: TaskDetail | null;
  attachments: TaskAttachment[];
  payments: TaskPayment[];
  loading: boolean;
  onUpdateTask: (updates: Record<string, unknown>) => Promise<unknown>;
  onAddAttachment: (data: { name: string; url: string; type?: string }) => Promise<unknown>;
  onDeleteAttachment: (attachmentId: number) => Promise<boolean>;
  onAddPayment: (data: { description: string; amount: number; date?: string }) => Promise<unknown>;
  onDeletePayment: (paymentId: number) => Promise<boolean>;
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
  loading,
  onUpdateTask,
  onAddAttachment,
  onDeleteAttachment,
  onAddPayment,
  onDeletePayment,
}: TaskInfoTabProps) {
  const [attachmentTab, setAttachmentTab] = useState("files");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkName, setNewLinkName] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [newPayment, setNewPayment] = useState({ description: "", amount: "", date: "" });
  const [addingPayment, setAddingPayment] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [newFile, setNewFile] = useState({ name: "", url: "", type: "file" });
  const [addingFile, setAddingFile] = useState(false);

  const handleAddPayment = async () => {
    if (!newPayment.description || !newPayment.amount) return;
    setAddingPayment(true);
    try {
      await onAddPayment({
        description: newPayment.description,
        amount: parseFloat(newPayment.amount),
        date: newPayment.date || new Date().toISOString().split("T")[0],
      });
      setNewPayment({ description: "", amount: "", date: "" });
      setShowPaymentDialog(false);
    } finally {
      setAddingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    await onDeletePayment(paymentId);
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
  const files = safeAttachments.filter((a) => a.type === "file" || a.type === "document");
  const images = safeAttachments.filter((a) => a.type === "image" || a.mimeType?.startsWith("image/"));
  const links = safeAttachments.filter((a) => a.type === "link");

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
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <RiAddLine className="h-4 w-4" />
                Agregar Pago
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Pago</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    placeholder="Ej: Anticipo proveedor"
                    value={newPayment.description}
                    onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Importe</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={newPayment.date}
                      onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddPayment} disabled={addingPayment || !newPayment.description || !newPayment.amount}>
                    {addingPayment ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="rounded-lg border border-border">
          <div className="grid grid-cols-4 gap-4 p-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
            <span>Descripción</span>
            <span>Fecha</span>
            <span>Importe</span>
            <span></span>
          </div>
          {safePayments.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No hay pagos registrados
            </div>
          ) : (
            <div className="divide-y divide-border">
              {safePayments.map((payment) => (
                <div key={payment.id} className="grid grid-cols-4 gap-4 p-3 items-center">
                  <span className="text-sm">{payment.description}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(payment.date).toLocaleDateString("es-ES")}
                  </span>
                  <span className="text-sm font-medium">${parseFloat(payment.amount).toLocaleString()}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive justify-self-end"
                    onClick={() => handleDeletePayment(payment.id)}
                  >
                    <RiDeleteBinLine className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attachments Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Archivos</h3>
          <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <RiAddLine className="h-4 w-4" />
                Subir Archivo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Subir Archivo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <FileUploader
                  folder="task-attachments"
                  onUpload={async (result) => {
                    await onAddAttachment({
                      name: result.name,
                      url: result.url,
                      type: result.type,
                    });
                    setShowFileDialog(false);
                  }}
                />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">o pega un enlace</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    placeholder="Ej: Contrato firmado.pdf"
                    value={newFile.name}
                    onChange={(e) => setNewFile({ ...newFile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL del archivo</Label>
                  <Input
                    placeholder="https://..."
                    value={newFile.url}
                    onChange={(e) => setNewFile({ ...newFile, url: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowFileDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddFile} disabled={addingFile || !newFile.name || !newFile.url}>
                    {addingFile ? "Guardando..." : "Guardar enlace"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border group"
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" download>
                          <RiDownloadLine className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onDeleteAttachment(file.id)}
                      >
                        <RiDeleteBinLine className="h-4 w-4" />
                      </Button>
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
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                  >
                    <img
                      src={image.thumbnail || image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button variant="secondary" size="icon" className="h-8 w-8" asChild>
                        <a href={image.url} target="_blank" rel="noopener noreferrer">
                          <RiDownloadLine className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onDeleteAttachment(image.id)}
                      >
                        <RiDeleteBinLine className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="links" className="mt-4 space-y-4">
            {/* Add link form */}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onDeleteAttachment(link.id)}
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
