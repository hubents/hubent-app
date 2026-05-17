import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

function verifyToken(orgId: number, token: string): boolean {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "hubents-ical";
  const expected = createHmac("sha256", secret).update(String(orgId)).digest("hex").slice(0, 20);
  return token === expected;
}

function escapeIcal(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icalDate(d: Date | null, allDay = true): string {
  if (!d) return "";
  if (allDay) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function eventStatus(status: string | null): string {
  if (status === "cancelled") return "CANCELLED";
  if (status === "draft") return "TENTATIVE";
  return "CONFIRMED";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await params;
  // token format: "{orgId}-{hmac}"
  const lastDash = rawToken.lastIndexOf("-");
  if (lastDash === -1) return new NextResponse("Invalid token", { status: 401 });

  const orgIdStr = rawToken.slice(0, lastDash);
  const hmac = rawToken.slice(lastDash + 1);
  const orgId = parseInt(orgIdStr, 10);
  if (isNaN(orgId) || !verifyToken(orgId, hmac)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { name: true },
  });
  if (!org) return new NextResponse("Not found", { status: 404 });

  const orgEvents = await db
    .select({
      id: events.id,
      name: events.name,
      date: events.date,
      endDate: events.endDate,
      location: events.location,
      description: events.description,
      status: events.status,
      type: events.type,
      updatedAt: events.updatedAt,
    })
    .from(events)
    .where(eq(events.organizationId, orgId));

  const now = new Date();
  const dtstamp = icalDate(now, false);
  const calName = escapeIcal(org.name || "Hubents");

  const vevents = orgEvents.map((e) => {
    const start = e.date ? new Date(e.date) : null;
    const end = e.endDate
      ? new Date(e.endDate)
      : start
        ? new Date(start.getTime() + 24 * 60 * 60 * 1000)
        : null;

    const lines: string[] = [
      "BEGIN:VEVENT",
      `UID:hubents-event-${e.id}@hubents`,
      `DTSTAMP:${dtstamp}Z`,
    ];

    if (start) {
      lines.push(`DTSTART;VALUE=DATE:${icalDate(start)}`);
      lines.push(`DTEND;VALUE=DATE:${icalDate(end || start)}`);
    }

    lines.push(`SUMMARY:${escapeIcal(e.name)}`);
    if (e.location) lines.push(`LOCATION:${escapeIcal(e.location)}`);

    const descParts: string[] = [];
    if (e.type) descParts.push(`Tipo: ${e.type}`);
    if (e.description) descParts.push(e.description);
    if (descParts.length) lines.push(`DESCRIPTION:${escapeIcal(descParts.join("\n"))}`);

    lines.push(`STATUS:${eventStatus(e.status)}`);
    if (e.updatedAt) lines.push(`LAST-MODIFIED:${icalDate(new Date(e.updatedAt), false)}Z`);
    lines.push("END:VEVENT");

    return lines.join("\r\n");
  });

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hubents//Events//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calName} · Hubents`,
    `X-WR-CALDESC:Eventos de ${calName} en Hubents`,
    "X-WR-TIMEZONE:UTC",
    ...vevents,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="hubents-eventos.ics"`,
      "Cache-Control": "no-cache, no-store",
    },
  });
}
