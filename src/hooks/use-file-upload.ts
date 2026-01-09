import { useState, useCallback } from "react";

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

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Validate file size (default 10MB for Cloudflare R2)
      const maxSize = options.maxSize || 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
        throw new Error(`El archivo excede el límite de ${maxMB}MB. Para archivos más grandes, usa un enlace externo.`);
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

      setProgress(10);

      // Use FormData for upload
      const formData = new FormData();
      formData.append("file", file);
      if (options.folder) {
        formData.append("folder", options.folder);
      }

      setProgress(30);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(90);

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Error al subir archivo");
      }

      setProgress(100);

      const result: UploadResult = {
        url: data.data.url,
        pathname: data.data.pathname,
        contentType: data.data.contentType,
        size: data.data.size || file.size,
        name: data.data.name || file.name,
        type: data.data.type,
      };

      options.onSuccess?.(result);
      return result;
    } catch (err) {
      console.error("Upload error:", err);
      let message = "Error desconocido al subir archivo";
      if (err instanceof Error) {
        message = err.message;
        // Make error messages more user-friendly
        if (message.includes("Content Too Large") || message.includes("413")) {
          message = "El archivo es demasiado grande. Máximo 10MB. Para archivos más grandes, usa un enlace externo.";
        } else if (message.includes("Unauthorized") || message.includes("401")) {
          message = "Sesión expirada. Por favor recarga la página.";
        } else if (message.includes("Failed to fetch")) {
          message = "Error de conexión. Verifica tu internet.";
        } else if (message.includes("CONFIG_ERROR")) {
          message = "El almacenamiento no está configurado. Contacta al administrador.";
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
