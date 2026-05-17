import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/password";
import { apiHandler, ok, badRequest, notFound } from "@/lib/api-handler";

/**
 * POST /api/user/security
 * Change user password
 */
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return badRequest("Contraseña actual y nueva son requeridas");
    }

    if (newPassword.length < 8) {
      return badRequest("La nueva contraseña debe tener al menos 8 caracteres");
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return notFound("Usuario no encontrado");
    }

    if (!user.passwordHash) {
      return badRequest("Este usuario no tiene contraseña configurada (usa login social)");
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return badRequest("La contraseña actual es incorrecta");
    }

    // Hash and save new password
    const newPasswordHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return ok({ message: "Contraseña actualizada correctamente" });
  }, "POST /api/user/security");
}
