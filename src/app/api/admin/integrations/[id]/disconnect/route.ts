import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { db } from "@/db";
import { organizationIntegrations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    await db
      .update(organizationIntegrations)
      .set({
        status: "disconnected",
        composioConnectedAccountId: null,
        connectedEmail: null,
        updatedAt: new Date(),
      })
      .where(eq(organizationIntegrations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Integrations] Disconnect error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
