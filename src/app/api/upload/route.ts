import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { requireRole } from "@/lib/session";

// Get the Blob token from environment
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// POST /api/upload - Upload a file to Vercel Blob
export async function POST(request: NextRequest) {
  try {
    // Check if Blob token is configured
    if (!BLOB_TOKEN) {
      console.error("BLOB_READ_WRITE_TOKEN is not configured");
      return NextResponse.json(
        { success: false, error: { code: "CONFIG_ERROR", message: "El almacenamiento de archivos no está configurado. Contacta al administrador." } },
        { status: 500 }
      );
    }

    await requireRole("viewer");

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

      // Validate file size (max 4.5MB due to Vercel Functions limit)
      const maxSize = 4.5 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          { success: false, error: { code: "FILE_TOO_LARGE", message: "El archivo excede el límite de 4.5MB. Para archivos más grandes, usa un enlace externo (Google Drive, Dropbox, etc.)" } },
          { status: 400 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const pathname = `${folder}/${timestamp}-${sanitizedName}`;

      // Upload to Vercel Blob with explicit token
      const blob = await put(pathname, file, {
        access: "public",
        addRandomSuffix: false,
        token: BLOB_TOKEN,
      });

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
          url: blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType,
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

// DELETE /api/upload - Delete a file from Vercel Blob
export async function DELETE(request: NextRequest) {
  try {
    if (!BLOB_TOKEN) {
      return NextResponse.json(
        { success: false, error: { code: "CONFIG_ERROR", message: "Almacenamiento no configurado" } },
        { status: 500 }
      );
    }

    await requireRole("planner");

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "URL requerida" } },
        { status: 400 }
      );
    }

    await del(url, { token: BLOB_TOKEN });

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
