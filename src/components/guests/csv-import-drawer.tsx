"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RiUploadLine, RiFileExcelLine, RiCheckLine, RiCloseLine } from "@remixicon/react";

interface CSVImportDrawerProps {
  eventId: number;
  onSuccess: () => void;
}

export function CSVImportDrawer({ eventId, onSuccess }: CSVImportDrawerProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/events/${eventId}/guests/import`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        onSuccess();
      } else {
        setError(data.error?.message || "Error al importar");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <RiUploadLine className="h-4 w-4" />
        Importar CSV
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Importar Invitados desde CSV</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="flex items-center justify-center gap-2">
                <RiFileExcelLine className="h-8 w-8 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  <RiCloseLine className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <RiUploadLine className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">Arrastra un archivo CSV o haz clic para seleccionar</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Columnas: nombre, apellido, email, telefono, grupo, menu
                </p>
              </div>
            )}
          </div>

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <RiCheckLine className="h-5 w-5" />
                <span className="font-medium">Importación completada</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                {result.imported} invitados importados
                {result.skipped > 0 && `, ${result.skipped} omitidos`}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <RiCloseLine className="h-5 w-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {result ? "Cerrar" : "Cancelar"}
            </Button>
            {!result && (
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? "Importando..." : "Importar"}
              </Button>
            )}
          </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
