import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/session";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin();

    const { id } = await params;
    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    const allowedFields = ["title", "content", "type", "isActive", "startsAt", "endsAt", "targetPlanIds"];

    for (const field of allowedFields) {
      if (field in body) {
        if (field === "startsAt" || field === "endsAt") {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(announcements)
      .set(updateData)
      .where(eq(announcements.id, announcementId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Anuncio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/admin/announcements/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar anuncio" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin();

    const { id } = await params;
    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    const [deleted] = await db
      .delete(announcements)
      .where(eq(announcements.id, announcementId))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Anuncio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/announcements/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar anuncio" },
      { status: 500 }
    );
  }
}
