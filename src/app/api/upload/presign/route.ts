import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getPresignedUploadUrl, isR2Configured } from "@/lib/r2";

// POST /api/upload/presign - Get a presigned URL for direct upload to R2
// This avoids the 4.5MB body limit on Vercel by uploading directly to R2
export async function POST(request: NextRequest) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: { code: "CONFIG_ERROR", message: "El almacenamiento de archivos no está configurado." } },
        { status: 500 }
      );
    }

    await requireRole("viewer");

    const body = await request.json();
    const { filename, contentType, size, folder } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Nombre y tipo de archivo requeridos" } },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (size && size > maxSize) {
      return NextResponse.json(
        { success: false, error: { code: "FILE_TOO_LARGE", message: "El archivo excede el límite de 10MB." } },
        { status: 400 }
      );
    }

    // Generate presigned URL
    const finalFilename = folder ? `${folder}/${filename}` : filename;
    const result = await getPresignedUploadUrl(finalFilename, contentType);

    if (!result) {
      return NextResponse.json(
        { success: false, error: { code: "PRESIGN_ERROR", message: "Error al generar URL de subida" } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl: result.uploadUrl,
        publicUrl: result.publicUrl,
        key: result.key,
      },
    });
  } catch (error) {
    console.error("POST /api/upload/presign error:", error);
    const message = error instanceof Error ? error.message : "Error al generar URL";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "PRESIGN_ERROR", message } },
      { status }
    );
  }
}
