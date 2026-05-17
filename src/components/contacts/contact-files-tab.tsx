"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUploader } from "@/components/ui/file-uploader";
import { FilePreviewDialog } from "@/components/ui/file-preview-dialog";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Folder01Icon,
  Image01Icon,
  File01Icon,
  Delete01Icon,
  PlusSignIcon,
  Download01Icon,
  ViewIcon,
  Pdf01Icon,
  Note01Icon,
} from "@hugeicons/core-free-icons";
import { downloadFile } from "@/lib/file-download";
import { appConfirm } from "@/lib/confirm";

const IcoFolder = hgIcon(Folder01Icon);
const IcoImage = hgIcon(Image01Icon);
const IcoFile = hgIcon(File01Icon);
const IcoTrash = hgIcon(Delete01Icon);
const IcoPlus = hgIcon(PlusSignIcon);
const IcoDownload = hgIcon(Download01Icon);
const IcoEye = hgIcon(ViewIcon);
const IcoPdf = hgIcon(Pdf01Icon);
const IcoDoc = hgIcon(Note01Icon);

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

interface PreviewFile {
  id: number;
  name: string;
  url: string;
  type: string;
  mimeType?: string | null;
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
  if (!mimeType) return IcoFile;
  if (mimeType.includes("pdf")) return IcoPdf;
  if (mimeType.includes("word") || mimeType.includes("document")) return IcoDoc;
  if (mimeType.includes("image")) return IcoImage;
  return IcoFile;
}

function photosToPreviewFiles(photos: ContactPhoto[]): PreviewFile[] {
  return photos.map((p) => ({
    id: p.id,
    name: p.caption || `Foto ${p.id}`,
    url: p.url,
    type: "image",
    mimeType: "image/jpeg",
  }));
}

function docsToPreviewFiles(documents: ContactDocument[]): PreviewFile[] {
  return documents.map((d) => ({
    id: d.id,
    name: d.name,
    url: d.url,
    type: d.type || "file",
    mimeType: d.mimeType,
  }));
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
  const [activeSubtab, setActiveSubtab] = useState<"photos" | "documents">("photos");
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);
  const [showDocUploader, setShowDocUploader] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<number | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<number | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const handlePhotoUpload = async (result: { url: string; name: string }) => {
    await onAddPhoto({ url: result.url });
    setShowPhotoUploader(false);
  };

  const handleDocUpload = async (result: { url: string; name: string; type: string; size: number; contentType: string }) => {
    await onAddDocument({
      name: result.name,
      url: result.url,
      mimeType: result.contentType,
      size: result.size,
    });
    setShowDocUploader(false);
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!await appConfirm({ title: "Eliminar foto", variant: "destructive", confirmLabel: "Eliminar" })) return;
    setDeletingPhoto(photoId);
    await onDeletePhoto(photoId);
    setDeletingPhoto(null);
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!await appConfirm({ title: "Eliminar documento", variant: "destructive", confirmLabel: "Eliminar" })) return;
    setDeletingDoc(docId);
    await onDeleteDocument(docId);
    setDeletingDoc(null);
  };

  const openPhotoPreview = (index: number) => {
    setPreviewFiles(photosToPreviewFiles(photos));
    setPreviewIndex(index);
    setPreviewOpen(true);
  };

  const openDocPreview = (index: number) => {
    setPreviewFiles(docsToPreviewFiles(documents));
    setPreviewIndex(index);
    setPreviewOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-[8px]" />
          ))}
        </div>
      </div>
    );
  }

  const totalFiles = photos.length + documents.length;

  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <IcoFolder className="h-4 w-4 text-[var(--ink-3)]" />
        <h3 className="text-[13px] font-semibold text-[var(--ink-1)]">Archivos</h3>
        <span className="text-[11.5px] text-[var(--ink-3)]">({totalFiles})</span>
      </div>

      {/* Subtab toggle */}
      <div
        className="grid grid-cols-2 rounded-[8px]"
        style={{ background: "var(--bg-subtle)", padding: 3 }}
      >
        <button
          onClick={() => setActiveSubtab("photos")}
          className="inline-flex items-center justify-center gap-1.5 rounded-[6px] cursor-pointer border-none transition-colors"
          style={{
            padding: "8px 10px",
            background: activeSubtab === "photos" ? "#FFFFFF" : "transparent",
            color: activeSubtab === "photos" ? "var(--ink-1)" : "var(--ink-3)",
            fontWeight: activeSubtab === "photos" ? 600 : 500,
            fontSize: 12.5,
            boxShadow: activeSubtab === "photos" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
          }}
        >
          <IcoImage className="h-3.5 w-3.5" />
          Fotos ({photos.length})
        </button>
        <button
          onClick={() => setActiveSubtab("documents")}
          className="inline-flex items-center justify-center gap-1.5 rounded-[6px] cursor-pointer border-none transition-colors"
          style={{
            padding: "8px 10px",
            background: activeSubtab === "documents" ? "#FFFFFF" : "transparent",
            color: activeSubtab === "documents" ? "var(--ink-1)" : "var(--ink-3)",
            fontWeight: activeSubtab === "documents" ? 600 : 500,
            fontSize: 12.5,
            boxShadow: activeSubtab === "documents" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
          }}
        >
          <IcoFile className="h-3.5 w-3.5" />
          Documentos ({documents.length})
        </button>
      </div>

      {activeSubtab === "photos" ? (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowPhotoUploader(!showPhotoUploader)}
              className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
            >
              <IcoPlus className="h-3 w-3" />
              Subir foto
            </button>
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
            <div
              className="text-center py-12 rounded-[8px]"
              style={{ border: "2px dashed var(--line-1)" }}
            >
              <IcoImage className="h-10 w-10 mx-auto text-[var(--ink-4)] mb-3" />
              <h3 className="text-[14px] font-semibold text-[var(--ink-1)] mb-1">Sin fotos aún</h3>
              <p className="text-[12.5px] text-[var(--ink-3)] mb-4">Sube tu primera foto</p>
              <button
                onClick={() => setShowPhotoUploader(true)}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors mx-auto hover:bg-[var(--bg-hover)]"
                style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
              >
                <IcoPlus className="h-3.5 w-3.5" />
                Subir foto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="relative group aspect-square rounded-[8px] overflow-hidden cursor-pointer"
                  style={{ border: "1px solid var(--line-1)" }}
                  onClick={() => openPhotoPreview(idx)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbnail || photo.url}
                    alt={photo.caption || "Foto"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); openPhotoPreview(idx); }}
                      className="h-8 w-8 rounded-[8px] inline-flex items-center justify-center cursor-pointer border-none transition-colors"
                      style={{ background: "#FFFFFF", color: "var(--ink-1)" }}
                      title="Vista previa"
                    >
                      <IcoEye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadFile(photo.url, photo.caption || `foto-${photo.id}.jpg`); }}
                      className="h-8 w-8 rounded-[8px] inline-flex items-center justify-center cursor-pointer border-none transition-colors"
                      style={{ background: "#FFFFFF", color: "var(--ink-1)" }}
                      title="Descargar"
                    >
                      <IcoDownload className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                      disabled={deletingPhoto === photo.id}
                      className="h-8 w-8 rounded-[8px] inline-flex items-center justify-center cursor-pointer border-none transition-colors"
                      style={{ background: "var(--color-danger)", color: "#FFFFFF" }}
                      title="Eliminar"
                    >
                      <IcoTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {photo.caption && (
                    <div
                      className="absolute bottom-0 left-0 right-0 text-white text-[11px] p-1.5 truncate"
                      style={{ background: "rgba(0,0,0,0.7)" }}
                    >
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowDocUploader(!showDocUploader)}
              className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
            >
              <IcoPlus className="h-3 w-3" />
              Subir documento
            </button>
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
            <div
              className="text-center py-12 rounded-[8px]"
              style={{ border: "2px dashed var(--line-1)" }}
            >
              <IcoFile className="h-10 w-10 mx-auto text-[var(--ink-4)] mb-3" />
              <h3 className="text-[14px] font-semibold text-[var(--ink-1)] mb-1">Sin documentos aún</h3>
              <p className="text-[12.5px] text-[var(--ink-3)] mb-4">Sube tu primer documento</p>
              <button
                onClick={() => setShowDocUploader(true)}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors mx-auto hover:bg-[var(--bg-hover)]"
                style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
              >
                <IcoPlus className="h-3.5 w-3.5" />
                Subir documento
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {documents.map((doc, idx) => {
                const FileIcon = getFileIcon(doc.mimeType);
                const isPdf = doc.mimeType?.includes("pdf");
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-[8px] p-3 transition-colors hover:bg-[var(--bg-subtle)]"
                    style={{ border: "1px solid var(--line-1)" }}
                  >
                    <div
                      className="h-10 w-10 rounded-[8px] flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isPdf ? "#FFE5E5" : "var(--bg-subtle)",
                        color: isPdf ? "#C33" : "var(--ink-2)",
                      }}
                    >
                      <FileIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--ink-1)] truncate">{doc.name}</p>
                      <p className="text-[11px] text-[var(--ink-3)]">
                        {formatFileSize(doc.size)}
                        {doc.uploadedAt && ` · ${new Date(doc.uploadedAt).toLocaleDateString("es-ES")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openDocPreview(idx)}
                        className="h-8 w-8 rounded-[8px] inline-flex items-center justify-center cursor-pointer border-none bg-transparent transition-colors hover:bg-[var(--bg-hover)]"
                        title="Vista previa"
                      >
                        <IcoEye className="h-3.5 w-3.5 text-[var(--ink-2)]" />
                      </button>
                      <button
                        onClick={() => downloadFile(doc.url, doc.name)}
                        className="h-8 w-8 rounded-[8px] inline-flex items-center justify-center cursor-pointer border-none bg-transparent transition-colors hover:bg-[var(--bg-hover)]"
                        title="Descargar"
                      >
                        <IcoDownload className="h-3.5 w-3.5 text-[var(--ink-2)]" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        disabled={deletingDoc === doc.id}
                        className="h-8 w-8 rounded-[8px] inline-flex items-center justify-center cursor-pointer border-none bg-transparent transition-colors hover:bg-[var(--bg-hover)]"
                        title="Eliminar"
                      >
                        <IcoTrash className="h-3.5 w-3.5 text-[var(--color-danger)]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
