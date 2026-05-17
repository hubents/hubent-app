import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, platformAdmins } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";
import { apiHandler, ok, notFound, badRequest, forbidden } from "@/lib/api-handler";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePlatformAdmin();

    if (session.user.platformLevel !== "super_admin") {
      return forbidden("Solo super admins pueden promover usuarios");
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { level = "support" } = body;

    if (!["super_admin", "support"].includes(level)) {
      return badRequest("Nivel inválido");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return notFound("Usuario no encontrado");
    }

    const existingAdmin = await db.query.platformAdmins.findFirst({
      where: eq(platformAdmins.userId, id),
    });

    if (existingAdmin) {
      await db
        .update(platformAdmins)
        .set({ level: level as "super_admin" | "support", updatedAt: new Date() })
        .where(eq(platformAdmins.userId, id));
    } else {
      await db.insert(platformAdmins).values({
        userId: id,
        level: level as "super_admin" | "support",
      });
    }

    return ok({
      message: existingAdmin ? "Nivel de admin actualizado" : "Usuario promovido a admin",
    });
  }, "POST /api/admin/users/[id]/promote");
}
