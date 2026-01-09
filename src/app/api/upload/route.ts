import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { requireRole } from "@/lib/session";

// POST /api/upload - Upload a file to Vercel Blob using streaming
export async function POST(request: NextRequest) {
  try {
    await requireRole("viewer");

    const contentType = request.headers.get("content-type") || "";
    
    // Handle multipart form data
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const folder = formData.get("folder") as string || "uploads";

      if (!file) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "No file provided" } },
          { status: 400 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const pathname = `${folder}/${timestamp}-${sanitizedName}`;

      // Upload to Vercel Blob
      const blob = await put(pathname, file, {
        access: "public",
        addRandomSuffix: false,
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

    // Handle direct blob upload (for streaming large files)
    const filename = request.headers.get("x-vercel-filename") || `upload-${Date.now()}`;
    const folder = request.headers.get("x-upload-folder") || "uploads";
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const pathname = `${folder}/${Date.now()}-${sanitizedName}`;

    const blob = await put(pathname, request.body!, {
      access: "public",
      addRandomSuffix: false,
      contentType: contentType || "application/octet-stream",
    });

    return NextResponse.json({
      success: true,
      data: {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        name: filename,
        type: "file",
      },
    });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    const message = error instanceof Error ? error.message : "Failed to upload file";
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
    await requireRole("planner");

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "URL is required" } },
        { status: 400 }
      );
    }

    await del(url);

    return NextResponse.json({
      success: true,
      data: { message: "File deleted successfully" },
    });
  } catch (error) {
    console.error("DELETE /api/upload error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete file";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 500 }
    );
  }
}
