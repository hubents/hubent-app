import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";
import { apiHandler, ok, badRequest, notFound, forbidden } from "@/lib/api-handler";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePlatformAdmin();

    if (session.user.platformLevel !== "super_admin") {
      return forbidden("Solo super admins pueden suspender usuarios");
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    if (id === session.user.userId) {
      return badRequest("No puedes suspenderte a ti mismo");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return notFound("Usuario no encontrado");
    }

    await db
      .update(users)
      .set({
        status: "suspended",
        suspendedAt: new Date(),
        suspendedBy: session.user.userId,
        suspendedReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return ok({ message: "Usuario suspendido" });
  }, "POST /api/admin/users/[id]/suspend");
}
