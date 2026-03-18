"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploader } from "@/components/ui/file-uploader";
import {
  RiFolderLine,
  RiImageLine,
  RiFileTextLine,
  RiDeleteBinLine,
  RiAddLine,
  RiDownloadLine,
  RiFilePdfLine,
  RiFileWordLine,
  RiFileExcelLine,
} from "@remixicon/react";
import { downloadFile } from "@/lib/file-download";

interface ContactPhoto {
  id: number;
  url: string;
  thumbnail: string | null;
  caption: string | null;
  sortOrder: number | null;
  uploadedAt: string | null;
}

interface ContactDocument {
  id: number;
  name: string;
  url: string;
  type: string | null;
  size: number | null;
  mimeType: string | null;
  uploadedAt: string | null;
}

interface ContactFilesTabProps {
  photos: ContactPhoto[];
  documents: ContactDocument[];
  loading: boolean;
  onAddPhoto: (data: { url: string; thumbnail?: string; caption?: string }) => Promise<unknown>;
  onDeletePhoto: (photoId: number) => Promise<boolean>;
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

export function ContactFilesTab({
  photos,
  documents,
  loading,
  onAddPhoto,
  onDeletePhoto,
  onAddDocument,
  onDeleteDocument,
}: ContactFilesTabProps) {
  const [activeTab, setActiveTab] = useState("photos");
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);
  const [showDocUploader, setShowDocUploader] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<number | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<number | null>(null);

  const handlePhotoUpload = async (result: { url: string; name: string }) => {
    await onAddPhoto({ url: result.url });
    setShowPhotoUploader(false);
  };

  const handleDocUpload = async (result: { url: string; name: string; type: string; size: number }) => {
    await onAddDocument({
      name: result.name,
      url: result.url,
      mimeType: result.type,
      size: result.size,
    });
    setShowDocUploader(false);
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm("¿Eliminar esta foto?")) return;
    setDeletingPhoto(photoId);
    await onDeletePhoto(photoId);
    setDeletingPhoto(null);
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm("¿Eliminar este documento?")) return;
    setDeletingDoc(docId);
    await onDeleteDocument(docId);
    setDeletingDoc(null);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const totalFiles = photos.length + documents.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <RiFolderLine className="h-5 w-5" />
        <h3 className="text-sm font-medium">Archivos</h3>
        <span className="text-xs">({totalFiles})</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="photos" className="gap-2">
            <RiImageLine className="h-4 w-4" />
            Fotos ({photos.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <RiFileTextLine className="h-4 w-4" />
            Documentos ({documents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPhotoUploader(!showPhotoUploader)}
              className="gap-2"
            >
              <RiAddLine className="h-4 w-4" />
              Subir foto
            </Button>
          </div>

          {showPhotoUploader && (
            <FileUploader
              folder="contacts/photos"
              accept="image/*"
              onUpload={handlePhotoUpload}
              onError={(error) => console.error("Upload error:", error)}
            />
          )}

          {photos.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <RiImageLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Sin fotos aún</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sube tu primera foto
              </p>
              <Button variant="outline" onClick={() => setShowPhotoUploader(true)}>
                <RiAddLine className="h-4 w-4 mr-2" />
                Subir foto
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group aspect-square rounded-lg overflow-hidden border"
                >
                  <img
                    src={photo.thumbnail || photo.url}
                    alt={photo.caption || "Foto"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeletePhoto(photo.id)}
                      disabled={deletingPhoto === photo.id}
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                    </Button>
                  </div>
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 truncate">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDocUploader(!showDocUploader)}
              className="gap-2"
            >
              <RiAddLine className="h-4 w-4" />
              Subir documento
            </Button>
          </div>

          {showDocUploader && (
            <FileUploader
              folder="contacts/documents"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              onUpload={handleDocUpload}
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
              <Button variant="outline" onClick={() => setShowDocUploader(true)}>
                <RiAddLine className="h-4 w-4 mr-2" />
                Subir documento
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
                      <Button variant="ghost" size="icon" onClick={() => downloadFile(doc.url, doc.name)}>
                        <RiDownloadLine className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDoc(doc.id)}
                        disabled={deletingDoc === doc.id}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
