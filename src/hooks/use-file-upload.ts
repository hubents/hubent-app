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

      // 1. Get presigned URL from server (avoids Vercel 4.5MB body limit)
      const presignResponse = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          folder: options.folder,
        }),
      });

      const presignData = await presignResponse.json();

      if (!presignData.success) {
        throw new Error(presignData.error?.message || "Error al obtener URL de subida");
      }

      setProgress(30);

      // 2. Upload directly to R2 using presigned URL
      const uploadResponse = await fetch(presignData.data.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Error al subir archivo a R2");
      }

      setProgress(100);

      // Determine file type category
      let fileType = "file";
      if (file.type.startsWith("image/")) {
        fileType = "image";
      } else if (file.type.startsWith("video/")) {
        fileType = "video";
      } else if (file.type.startsWith("audio/")) {
        fileType = "audio";
      } else if (file.type === "application/pdf") {
        fileType = "document";
      }

      const result: UploadResult = {
        url: presignData.data.publicUrl,
        pathname: presignData.data.key,
        contentType: file.type,
        size: file.size,
        name: file.name,
        type: fileType,
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
      // Extract R2 object key from the full public URL (e.g. "uploads/123-file.pdf")
      const key = url.includes("/uploads/")
        ? "uploads/" + url.split("/uploads/").pop()
        : url;
      const response = await fetch(`/api/upload?key=${encodeURIComponent(key)}`, {
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
