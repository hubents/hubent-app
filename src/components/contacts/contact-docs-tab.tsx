"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUploader } from "@/components/ui/file-uploader";
import {
  RiFileTextLine,
  RiDeleteBinLine,
  RiAddLine,
  RiDownloadLine,
  RiFilePdfLine,
  RiFileWordLine,
  RiFileExcelLine,
  RiImageLine,
} from "@remixicon/react";
import { downloadFile } from "@/lib/file-download";

interface ContactDocument {
  id: number;
  name: string;
  url: string;
  type: string | null;
  size: number | null;
  mimeType: string | null;
  uploadedAt: string | null;
}

interface ContactDocsTabProps {
  documents: ContactDocument[];
  loading: boolean;
  onAddDocument: (data: { name: string; url: string; type?: string; size?: number; mimeType?: string }) => Promise<unknown>;
  onDeleteDocument: (documentId: number) => Promise<boolean>;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return RiFileTextLine;
  if (mimeType.includes("pdf")) return RiFilePdfLine;
  if (mimeType.includes("word") || mimeType.includes("document")) return RiFileWordLine;
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return RiFileExcelLine;
  if (mimeType.includes("image")) return RiImageLine;
  return RiFileTextLine;
}

export function ContactDocsTab({
  documents,
  loading,
  onAddDocument,
  onDeleteDocument,
}: ContactDocsTabProps) {
  const [showUploader, setShowUploader] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleUpload = async (result: { url: string; name: string; type: string; size: number }) => {
    await onAddDocument({
      name: result.name,
      url: result.url,
      mimeType: result.type,
      size: result.size,
    });
    setShowUploader(false);
  };

  const handleDelete = async (documentId: number) => {
    if (!confirm("¿Eliminar este documento?")) return;
    setDeleting(documentId);
    await onDeleteDocument(documentId);
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RiFileTextLine className="h-5 w-5" />
          <h3 className="text-sm font-medium">Documents</h3>
          <span className="text-xs">({documents.length})</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUploader(!showUploader)}
          className="gap-2"
        >
          <RiAddLine className="h-4 w-4" />
          Subir Documento
        </Button>
      </div>

      {showUploader && (
        <FileUploader
          folder="contacts/documents"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          onUpload={handleUpload}
          onError={(error) => console.error("Upload error:", error)}
        />
      )}

      {documents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <RiFileTextLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Sin documentos aún</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sube tu primer documento
          </p>
          <Button variant="outline" onClick={() => setShowUploader(true)}>
            <RiAddLine className="h-4 w-4 mr-2" />
            Subir Documento
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const FileIcon = getFileIcon(doc.mimeType);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-muted">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.size)}
                    {doc.uploadedAt && ` • ${new Date(doc.uploadedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => downloadFile(doc.url, doc.name)}
                  >
                    <RiDownloadLine className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                    className="text-destructive hover:text-destructive"
                  >
                    <RiDeleteBinLine className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
