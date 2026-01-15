import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, organizationMembers } from "@/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import { notifyEventReminder } from "@/lib/push-notifications";

// Vercel Cron configuration
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/event-reminders
 * 
 * This endpoint is called by Vercel Cron to send event reminders.
 * It checks for events happening in the next 24 hours and 1 hour.
 * 
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/event-reminders",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Find events starting in ~1 hour (between now+55min and now+65min)
    const eventsIn1Hour = await db
      .select({
        id: events.id,
        name: events.name,
        date: events.date,
        organizationId: events.organizationId,
      })
      .from(events)
      .where(
        and(
          gte(events.date, new Date(now.getTime() + 55 * 60 * 1000)),
          lte(events.date, new Date(now.getTime() + 65 * 60 * 1000))
        )
      );

    // Find events starting in ~24 hours (between now+23h and now+25h)
    const eventsIn24Hours = await db
      .select({
        id: events.id,
        name: events.name,
        date: events.date,
        organizationId: events.organizationId,
      })
      .from(events)
      .where(
        and(
          gte(events.date, new Date(now.getTime() + 23 * 60 * 60 * 1000)),
          lte(events.date, in25Hours)
        )
      );

    let notificationsSent = 0;

    // Send 1-hour reminders
    for (const event of eventsIn1Hour) {
      if (!event.date || !event.organizationId) continue;
      
      await notifyEventReminder(
        event.organizationId.toString(),
        event.id,
        event.name,
        event.date,
        1
      );
      notificationsSent++;
    }

    // Send 24-hour reminders
    for (const event of eventsIn24Hours) {
      if (!event.date || !event.organizationId) continue;
      
      await notifyEventReminder(
        event.organizationId.toString(),
        event.id,
        event.name,
        event.date,
        24
      );
      notificationsSent++;
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${notificationsSent} event reminders`,
      details: {
        eventsIn1Hour: eventsIn1Hour.length,
        eventsIn24Hours: eventsIn24Hours.length,
      },
    });
  } catch (error) {
    console.error("Cron event-reminders error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}
