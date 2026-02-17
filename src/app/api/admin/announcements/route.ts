import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/session";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    await requirePlatformAdmin();

    const all = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));

    return NextResponse.json({ success: true, data: all });
  } catch (error) {
    console.error("GET /api/admin/announcements error:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener anuncios" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const body = await request.json();
    const { title, content, type, isActive, startsAt, endsAt, targetPlanIds } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: "Título y contenido son requeridos" },
        { status: 400 }
      );
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

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error("POST /api/admin/announcements error:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear anuncio" },
      { status: 500 }
    );
  }
}
