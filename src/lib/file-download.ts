"use client";

import { toast } from "sonner";

/**
 * Download any file via fetch → blob → programmatic click.
 * Works for cross-origin URLs (R2, S3, etc.) where the HTML
 * `download` attribute is silently ignored by browsers.
 */
export async function downloadFile(
  url: string,
  filename: string
): Promise<void> {
  const toastId = toast.loading("Descargando...");

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error al descargar el archivo");

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    toast.success("Archivo descargado", { id: toastId });
  } catch (error) {
    console.error("File download error:", error);
    toast.error("Error al descargar archivo", { id: toastId });
  }
}
