import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getOrgSubmissions } from "@/lib/form-submissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requirePermission("forms:read");
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const { rows, total } = await getOrgSubmissions(session.organizationId, limit, offset);

    return NextResponse.json({
      success: true,
      data: rows,
      meta: { total, limit, offset },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
