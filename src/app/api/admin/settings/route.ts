import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/session";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    await requirePlatformAdmin();

    const settings = await db.select().from(platformSettings);

    const settingsMap: Record<string, string | null> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({ success: true, data: settingsMap });
  } catch (error) {
    console.error("GET /api/admin/settings error:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener configuración" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const body = await request.json();
    const updates = body as Record<string, string>;

    for (const [key, value] of Object.entries(updates)) {
      const existing = await db.query.platformSettings.findFirst({
        where: eq(platformSettings.key, key),
      });

      if (existing) {
        await db
          .update(platformSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(platformSettings.key, key));
      } else {
        await db.insert(platformSettings).values({
          key,
          value,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/settings error:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar configuración" },
      { status: 500 }
    );
  }
}
