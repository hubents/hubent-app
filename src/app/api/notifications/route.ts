import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const unreadOnly = searchParams.get("unread") === "true";

    const whereClause = unreadOnly
      ? and(eq(notifications.userId, session.user.userId), eq(notifications.read, false))
      : eq(notifications.userId, session.user.userId);

    const [results, unreadRows] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(limit),
      db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, session.user.userId),
            eq(notifications.read, false)
          )
        ),
    ]);

    return ok(results, 200, { unreadCount: unreadRows.length });
  }, "GET /api/notifications");
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const body = await request.json();
    const { notificationIds, markAllRead } = body;

    if (markAllRead) {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, session.user.userId));
    } else if (notificationIds && Array.isArray(notificationIds)) {
      for (const id of notificationIds) {
        await db
          .update(notifications)
          .set({ read: true })
          .where(
            and(
              eq(notifications.id, id),
              eq(notifications.userId, session.user.userId)
            )
          );
      }
    }

    return ok(null);
  }, "PATCH /api/notifications");
}

// DELETE /api/notifications - Delete a notification
export async function DELETE(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");

    if (!notificationId) {
      return badRequest("Notification ID is required");
    }

    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, parseInt(notificationId, 10)),
          eq(notifications.userId, session.user.userId)
        )
      );

    return ok(null);
  }, "DELETE /api/notifications");
}
