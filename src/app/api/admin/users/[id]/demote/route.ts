import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, platformAdmins } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";
import { apiHandler, ok, notFound, badRequest, forbidden } from "@/lib/api-handler";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePlatformAdmin();

    if (session.user.platformLevel !== "super_admin") {
      return forbidden("Solo super admins pueden revocar permisos de admin");
    }

    const { id } = await params;

    if (id === session.user.userId) {
      return badRequest("No puedes revocarte tus propios permisos de admin");
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

    if (!existingAdmin) {
      return badRequest("El usuario no es administrador");
    }

    await db.delete(platformAdmins).where(eq(platformAdmins.userId, id));

    return ok({ message: "Permisos de admin revocados" });
  }, "POST /api/admin/users/[id]/demote");
}
