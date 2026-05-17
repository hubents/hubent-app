import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, platformAdmins } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler, ok, notFound, badRequest, forbidden } from "@/lib/api-handler";

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return badRequest("Email es requerido");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return notFound("Usuario no encontrado");
    }

    const adminRecord = await db.query.platformAdmins.findFirst({
      where: eq(platformAdmins.userId, user.id),
    });

    if (!adminRecord) {
      return forbidden("No tienes permisos de administrador");
    }

    return ok({ level: adminRecord.level });
  }, "POST /api/admin/verify-access");
}
