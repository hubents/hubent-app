import { db } from "@/db";
import { platformAdmins } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const admin = await db
    .select()
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, userId))
    .limit(1);

  return admin.length > 0;
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const admin = await db
    .select()
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, userId))
    .limit(1);

  return admin.length > 0 && admin[0].level === "super_admin";
}

export async function getPlatformAdmin(userId: string) {
  const admin = await db
    .select()
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, userId))
    .limit(1);

  return admin[0] || null;
}
