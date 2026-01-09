import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { del } from "@vercel/blob";
import { requireRole, getSession } from "@/lib/session";

// POST /api/upload - Handle client-side upload to Vercel Blob
// This uses client uploads to bypass the 4.5MB Vercel Functions limit
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Verify user has permission before generating upload token
        await requireRole("viewer");
        
        return {
          allowedContentTypes: [
            "image/*",
            "video/*",
            "audio/*",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
            "text/csv",
          ],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB max
          tokenPayload: JSON.stringify({
            email: session.user.email,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This runs after upload completes
        console.log("Upload completed:", blob.url, tokenPayload);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("POST /api/upload error:", error);
    const message = error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_ERROR", message } },
      { status: 500 }
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
