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
      // Validate file size
      if (options.maxSize && file.size > options.maxSize) {
        const maxMB = (options.maxSize / (1024 * 1024)).toFixed(0);
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

      const formData = new FormData();
      formData.append("file", file);
      if (options.folder) {
        formData.append("folder", options.folder);
      }

      setProgress(10);

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
      options.onSuccess?.(data.data);
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
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
