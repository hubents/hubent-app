import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";
import { apiHandler, ok, notFound, forbidden } from "@/lib/api-handler";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePlatformAdmin();

    if (session.user.platformLevel !== "super_admin") {
      return forbidden("Solo super admins pueden reactivar usuarios");
    }

    const { id } = await params;

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return notFound("Usuario no encontrado");
    }

    await db
      .update(users)
      .set({
        status: "active",
        suspendedAt: null,
        suspendedBy: null,
        suspendedReason: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return ok({ message: "Usuario reactivado" });
  }, "POST /api/admin/users/[id]/reactivate");
}
