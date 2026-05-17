import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/session";
import { eq } from "drizzle-orm";
import { apiHandler, ok, badRequest, notFound } from "@/lib/api-handler";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requirePlatformAdmin();

    const { id } = await params;
    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return badRequest("ID inválido");
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
      return notFound("Anuncio no encontrado");
    }

    return ok(updated);
  }, "PATCH /api/admin/announcements/[id]");
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requirePlatformAdmin();

    const { id } = await params;
    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return badRequest("ID inválido");
    }

    const [deleted] = await db
      .delete(announcements)
      .where(eq(announcements.id, announcementId))
      .returning();

    if (!deleted) {
      return notFound("Anuncio no encontrado");
    }

    return ok(null);
  }, "DELETE /api/admin/announcements/[id]");
}
