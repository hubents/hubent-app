import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { uploadToR2, deleteFromR2, isR2Configured } from "@/lib/r2";

// NOTE: For large files, use /api/upload/presign instead to upload directly to R2
// This endpoint is kept for backwards compatibility but has Vercel's 4.5MB body limit

// POST /api/upload - Upload a file to Cloudflare R2 (limited to ~4MB due to Vercel)
export async function POST(request: NextRequest) {
  try {
    // Check if R2 is configured
    if (!isR2Configured()) {
      console.error("Cloudflare R2 is not configured");
      return NextResponse.json(
        { success: false, error: { code: "CONFIG_ERROR", message: "El almacenamiento de archivos no está configurado. Contacta al administrador." } },
        { status: 500 }
      );
    }

    await requirePermission("events:read");

    const contentType = request.headers.get("content-type") || "";
    
    // Handle multipart form data
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const folder = formData.get("folder") as string || "uploads";

      if (!file) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "No se proporcionó ningún archivo" } },
          { status: 400 }
        );
      }

      // Validate file size (max 10MB - R2 can handle more but keeping reasonable for UX)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          { success: false, error: { code: "FILE_TOO_LARGE", message: "El archivo excede el límite de 10MB. Para archivos más grandes, usa un enlace externo." } },
          { status: 400 }
        );
      }

      // Convert file to buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${folder}/${file.name}`;

      // Upload to Cloudflare R2
      let result;
      try {
        result = await uploadToR2(buffer, filename, file.type);
      } catch (uploadError) {
        const errorMsg = uploadError instanceof Error ? uploadError.message : "Error desconocido";
        console.error("Upload to R2 failed:", errorMsg);
        return NextResponse.json(
          { success: false, error: { code: "UPLOAD_ERROR", message: errorMsg } },
          { status: 500 }
        );
      }

      if (!result) {
        return NextResponse.json(
          { success: false, error: { code: "UPLOAD_ERROR", message: "Error al subir archivo a R2 - resultado nulo" } },
          { status: 500 }
        );
      }

      // Determine file type
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

      return NextResponse.json({
        success: true,
        data: {
          url: result.url,
          pathname: result.key,
          contentType: file.type,
          size: file.size,
          name: file.name,
          type: fileType,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: { code: "INVALID_REQUEST", message: "Formato de request inválido" } },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/upload error:", error);
    const message = error instanceof Error ? error.message : "Error al subir archivo";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_ERROR", message } },
      { status }
    );
  }
}

// DELETE /api/upload - Delete a file from Cloudflare R2
export async function DELETE(request: NextRequest) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: { code: "CONFIG_ERROR", message: "Almacenamiento no configurado" } },
        { status: 500 }
      );
    }

    await requirePermission("events:update");

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Key requerida" } },
        { status: 400 }
      );
    }

    const success = await deleteFromR2(key);

    if (!success) {
      return NextResponse.json(
        { success: false, error: { code: "DELETE_ERROR", message: "Error al eliminar archivo" } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: "Archivo eliminado correctamente" },
    });
  } catch (error) {
    console.error("DELETE /api/upload error:", error);
    const message = error instanceof Error ? error.message : "Error al eliminar archivo";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 500 }
    );
  }
}
