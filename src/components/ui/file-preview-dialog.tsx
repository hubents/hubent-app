"use client";

import { useCallback, useEffect } from "react";
import {
  RiCloseLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiExternalLinkLine,
  RiFileTextLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/file-download";

interface PreviewFile {
  id: number;
  name: string;
  url: string;
  type: string;
  mimeType?: string | null;
}

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: PreviewFile[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

function isPdf(file: PreviewFile): boolean {
  return (
    file.mimeType === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isImage(file: PreviewFile): boolean {
  return (
    file.type === "image" ||
    file.mimeType?.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(file.name)
  );
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  files,
  currentIndex,
  onIndexChange,
}: FilePreviewDialogProps) {
  const file = files[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(currentIndex + 1);
  }, [hasNext, currentIndex, onIndexChange]);

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(currentIndex - 1);
  }, [hasPrev, currentIndex, onIndexChange]);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, close, goPrev, goNext]);

  if (!open || !file) return null;

  const fileIsImage = isImage(file);
  const fileIsPdf = isPdf(file);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={close}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-black/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded bg-white/10 flex items-center justify-center shrink-0">
            {fileIsImage ? (
              <img
                src={file.url}
                alt=""
                className="h-6 w-6 rounded object-cover"
              />
            ) : (
              <RiFileTextLine className="h-4 w-4 text-white/70" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {file.name}
            </p>
            <p className="text-xs text-white/50">
              {currentIndex + 1} de {files.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
            asChild
          >
            <a href={file.url} target="_blank" rel="noopener noreferrer">
              <RiExternalLinkLine className="h-5 w-5" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => downloadFile(file.url, file.name)}
          >
            <RiDownloadLine className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
            onClick={close}
          >
            <RiCloseLine className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center overflow-hidden">
        {/* Previous button */}
        {hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className={cn(
              "absolute left-3 z-20 h-10 w-10 rounded-full",
              "bg-black/40 hover:bg-black/60 text-white/80 hover:text-white",
              "flex items-center justify-center transition-all",
              "focus:outline-none focus:ring-2 focus:ring-white/30"
            )}
          >
            <RiArrowLeftSLine className="h-6 w-6" />
          </button>
        )}

        {/* File viewer */}
        <div
          className="w-full h-full flex items-center justify-center p-4"
          onClick={close}
        >
          {fileIsImage && (
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {fileIsPdf && (
            <iframe
              src={file.url}
              title={file.name}
              className="w-full max-w-5xl h-full rounded-lg shadow-2xl bg-white animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {!fileIsImage && !fileIsPdf && (
            <div
              className="flex flex-col items-center gap-4 p-8 rounded-xl bg-white/10 backdrop-blur animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <RiFileTextLine className="h-16 w-16 text-white/50" />
              <p className="text-white/80 text-sm font-medium">{file.name}</p>
              <p className="text-white/50 text-xs">
                Vista previa no disponible para este tipo de archivo
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" asChild>
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    <RiExternalLinkLine className="h-4 w-4 mr-2" />
                    Abrir
                  </a>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => downloadFile(file.url, file.name)}>
                  <RiDownloadLine className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Next button */}
        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className={cn(
              "absolute right-3 z-20 h-10 w-10 rounded-full",
              "bg-black/40 hover:bg-black/60 text-white/80 hover:text-white",
              "flex items-center justify-center transition-all",
              "focus:outline-none focus:ring-2 focus:ring-white/30"
            )}
          >
            <RiArrowRightSLine className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
}
