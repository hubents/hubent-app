import { useState, useCallback } from "react";
import { upload as vercelUpload } from "@vercel/blob/client";

interface UploadResult {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  name: string;
  type: string;
}

interface UseFileUploadOptions {
  folder?: string;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

function getFileType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "document";
  return "file";
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Validate file size (default 100MB)
      const maxSize = options.maxSize || 100 * 1024 * 1024;
      if (file.size > maxSize) {
        const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
        throw new Error(`El archivo excede el límite de ${maxMB}MB`);
      }

      // Validate file type
      if (options.allowedTypes && options.allowedTypes.length > 0) {
        const isAllowed = options.allowedTypes.some(type => {
          if (type.endsWith("/*")) {
            return file.type.startsWith(type.replace("/*", "/"));
          }
          return file.type === type;
        });
        if (!isAllowed) {
          throw new Error("Tipo de archivo no permitido");
        }
      }

      // Generate pathname with folder
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const folder = options.folder || "uploads";
      const pathname = `${folder}/${timestamp}-${sanitizedName}`;

      setProgress(10);

      // Use Vercel Blob client upload (bypasses 4.5MB server limit)
      const blob = await vercelUpload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 80) + 10;
          setProgress(percent);
        },
      });

      setProgress(100);

      const result: UploadResult = {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        size: file.size,
        name: file.name,
        type: getFileType(file.type),
      };

      options.onSuccess?.(result);
      return result;
    } catch (err) {
      console.error("Upload error:", err);
      let message = "Error desconocido al subir archivo";
      if (err instanceof Error) {
        message = err.message;
        // Make error messages more user-friendly
        if (message.includes("No token found")) {
          message = "Error de configuración del servidor. Contacta al administrador.";
        } else if (message.includes("Content Too Large") || message.includes("413")) {
          message = "El archivo es demasiado grande. Máximo 100MB.";
        }
      }
      setError(message);
      options.onError?.(message);
      return null;
    } finally {
      setUploading(false);
    }
  }, [options]);

  const deleteFile = useCallback(async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/upload?url=${encodeURIComponent(url)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      return data.success;
    } catch {
      return false;
    }
  }, []);

  return {
    upload,
    deleteFile,
    uploading,
    progress,
    error,
    clearError: () => setError(null),
  };
}
