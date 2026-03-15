"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  RiUploadCloud2Line,
  RiImageLine,
  RiVideoLine,
  RiFileTextLine,
  RiCloseLine,
  RiCheckLine,
} from "@remixicon/react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { cn } from "@/lib/utils";

const BLOCKED_VIDEO_TYPES = [
  "video/mp4", "video/mpeg", "video/webm", "video/ogg",
  "video/quicktime", "video/x-msvideo", "video/x-matroska",
  "video/3gpp", "video/x-flv", "video/x-ms-wmv",
];

const ALLOWED_EXTENSIONS = [
  // Images
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico",
  // Documents
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv", ".rtf", ".odt", ".ods", ".odp",
  // Archives
  ".zip", ".rar", ".7z",
];

interface FileUploaderProps {
  folder?: string;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  blockVideos?: boolean;
  onUpload: (result: { url: string; name: string; type: string; size: number }) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: "default" | "compact" | "dropzone";
}

export function FileUploader({
  folder = "uploads",
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default (Cloudflare R2)
  multiple = false,
  blockVideos = true,
  onUpload,
  onError,
  className,
  variant = "default",
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upload, uploading, progress, error: uploadError } = useFileUpload({
    folder,
    maxSize,
    onSuccess: (result) => {
      onUpload({
        url: result.url,
        name: result.name,
        type: result.type,
        size: result.size,
      });
    },
    onError,
  });

  const validateFileType = useCallback((file: File): string | null => {
    if (blockVideos && (file.type.startsWith("video/") || BLOCKED_VIDEO_TYPES.includes(file.type))) {
      return "No se permiten videos. Solo podés subir imágenes, PDFs y documentos.";
    }
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (ext && ALLOWED_EXTENSIONS.length > 0 && !accept) {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      const isDoc = file.type.startsWith("application/") || file.type.startsWith("text/");
      if (!isImage && !isPdf && !isDoc && !ALLOWED_EXTENSIONS.includes(ext)) {
        return "Tipo de archivo no soportado. Solo se permiten imágenes, PDFs y documentos.";
      }
    }
    return null;
  }, [blockVideos, accept]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesToUpload = multiple ? Array.from(files) : [files[0]];
    
    for (const file of filesToUpload) {
      const validationError = validateFileType(file);
      if (validationError) {
        setTypeError(validationError);
        onError?.(validationError);
        return;
      }
      setTypeError(null);
      const result = await upload(file);
      if (result) {
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 2000);
      }
    }
  }, [upload, multiple, validateFileType, onError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getAcceptLabel = () => {
    if (!accept) return "archivos";
    if (accept.includes("image")) return "imágenes";
    if (accept.includes("video")) return "videos";
    if (accept.includes("pdf")) return "PDFs";
    return "archivos";
  };

  const getIcon = () => {
    if (!accept) return <RiUploadCloud2Line className="h-8 w-8" />;
    if (accept.includes("image")) return <RiImageLine className="h-8 w-8" />;
    if (accept.includes("video")) return <RiVideoLine className="h-8 w-8" />;
    return <RiFileTextLine className="h-8 w-8" />;
  };

  if (variant === "compact") {
    return (
      <div className={className}>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={uploading}
          className="gap-2"
        >
          <RiUploadCloud2Line className="h-4 w-4" />
          {uploading ? `Subiendo... ${progress}%` : "Subir archivo"}
        </Button>
        {(typeError || uploadError) && <p className="text-xs text-destructive mt-1">{typeError || uploadError}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
          "hover:border-primary/50 hover:bg-primary/5",
          isDragging && "border-primary bg-primary/10",
          uploading && "pointer-events-none opacity-60",
          className
        )}
      >
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          {uploadSuccess ? (
            <>
              <div className="rounded-full p-3 bg-green-100 text-green-600">
                <RiCheckLine className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-green-600">Archivo subido correctamente</p>
            </>
          ) : (
            <>
              <div className={cn(
                "rounded-full p-3 bg-muted",
                isDragging && "bg-primary/20 text-primary"
              )}>
                {getIcon()}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isDragging ? "Suelta aquí" : "Arrastra y suelta"}
                </p>
                <p className="text-xs text-muted-foreground">
                  o haz clic para seleccionar {getAcceptLabel()}
                </p>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Máximo <span className="font-medium">{(maxSize / (1024 * 1024)).toFixed(0)}MB</span></p>
                <p className="text-[10px]">Imágenes, PDFs y documentos</p>
              </div>
            </>
          )}
        </div>

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
            <div className="w-3/4 space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                Subiendo... {progress}%
              </p>
            </div>
          </div>
        )}
      </div>

      {(typeError || uploadError) && (
        <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
          <RiCloseLine className="h-4 w-4" />
          {typeError || uploadError}
        </div>
      )}
    </div>
  );
}
