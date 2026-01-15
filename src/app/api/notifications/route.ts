import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const unreadOnly = searchParams.get("unread") === "true";

    let query = db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, session.user.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    if (unreadOnly) {
      query = db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, session.user.userId),
            eq(notifications.read, false)
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    }

    const results = await query;

    // Count unread
    const unreadCount = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, session.user.userId),
          eq(notifications.read, false)
        )
      );

    return NextResponse.json({
      success: true,
      data: results,
      unreadCount: unreadCount.length,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete old notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");

    if (notificationId) {
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, parseInt(notificationId, 10)),
            eq(notifications.userId, session.user.userId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notifications error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
