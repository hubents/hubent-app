import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { success: false, error: "url parameter is required" },
        { status: 400 }
      );
    }

    const r2PublicUrl = process.env.R2_PUBLIC_URL;
    if (!r2PublicUrl || !url.startsWith(r2PublicUrl)) {
      return NextResponse.json(
        { success: false, error: "Invalid file URL" },
        { status: 403 }
      );
    }

    const fileRes = await fetch(url);
    if (!fileRes.ok) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    const contentType =
      fileRes.headers.get("content-type") || "application/octet-stream";
    const blob = await fileRes.blob();

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("GET /api/files/view error:", error);
    const message = error instanceof Error ? error.message : "View failed";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
