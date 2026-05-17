import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/session";
import { desc } from "drizzle-orm";
import { apiHandler, ok, created as createdResponse, badRequest } from "@/lib/api-handler";

export async function GET() {
  return apiHandler(async () => {
    await requirePlatformAdmin();

    const all = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));

    return ok(all);
  }, "GET /api/admin/announcements");
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    await requirePlatformAdmin();

    const body = await request.json();
    const { title, content, type, isActive, startsAt, endsAt, targetPlanIds } = body;

    if (!title || !content) {
      return badRequest("Título y contenido son requeridos");
    }

    const [created] = await db
      .insert(announcements)
      .values({
        title,
        content,
        type: type || "info",
        isActive: isActive ?? true,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        endsAt: endsAt ? new Date(endsAt) : null,
        targetPlanIds: targetPlanIds || null,
      })
      .returning();

    return createdResponse(created);
  }, "POST /api/admin/announcements");
}
