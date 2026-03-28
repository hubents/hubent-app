import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import {
  guests,
  rsvpResponses,
  guestGroups,
  guestCompanions,
  eventTables,
  events,
  organizations,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type RouteParams = { params: Promise<{ eventId: string }> };

interface GuestRow {
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  rsvpStatus: string | null;
  menuPreference: string | null;
  ageGroup: string | null;
  groupName: string | null;
  tableName: string | null;
  companions: string;
  companionCount: number;
}

// GET /api/events/[eventId]/guests/pdf - Guest list HTML for client-side PDF
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "guests", "view");

    const [event] = await db
      .select({ name: events.name, date: events.date, location: events.location })
      .from(events)
      .where(eq(events.id, eventIdNum))
      .limit(1);

    const [org] = await db
      .select({ name: organizations.name, logo: organizations.logo, invoiceLogo: organizations.invoiceLogo })
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1);

    const guestList = await db
      .select({
        id: guests.id,
        firstName: guests.firstName,
        lastName: guests.lastName,
        email: guests.email,
        phone: guests.phone,
        menuPreference: guests.menuPreference,
        ageGroup: guests.ageGroup,
        rsvpStatus: rsvpResponses.status,
        groupName: guestGroups.name,
        tableName: eventTables.name,
      })
      .from(guests)
      .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
      .leftJoin(guestGroups, eq(guests.groupId, guestGroups.id))
      .leftJoin(eventTables, eq(guests.tableId, eventTables.id))
      .where(eq(guests.eventId, eventIdNum))
      .orderBy(guestGroups.name, guests.lastName, guests.firstName);

    const guestsWithCompanions: GuestRow[] = await Promise.all(
      guestList.map(async (guest) => {
        const companions = await db
          .select({ fullName: guestCompanions.fullName })
          .from(guestCompanions)
          .where(eq(guestCompanions.guestId, guest.id));

        return {
          ...guest,
          companions: companions.map((c) => c.fullName).join(", "),
          companionCount: companions.length,
        };
      })
    );

    // Stats
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        confirmed: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'confirmed')`,
        declined: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'declined')`,
        pending: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'pending' or ${rsvpResponses.status} is null)`,
        adults: sql<number>`count(*) filter (where ${guests.ageGroup} = 'adult' or ${guests.ageGroup} is null)`,
        children: sql<number>`count(*) filter (where ${guests.ageGroup} = 'child')`,
        babies: sql<number>`count(*) filter (where ${guests.ageGroup} = 'baby')`,
      })
      .from(guests)
      .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
      .where(eq(guests.eventId, eventIdNum));

    let logoDataUri: string | undefined = org?.invoiceLogo || org?.logo || undefined;
    if (logoDataUri && logoDataUri.startsWith("http")) {
      try {
        const logoRes = await fetch(logoDataUri);
        const logoBuffer = await logoRes.arrayBuffer();
        const contentType = logoRes.headers.get("content-type") || "image/png";
        logoDataUri = `data:${contentType};base64,${Buffer.from(logoBuffer).toString("base64")}`;
      } catch {
        // Keep original URL as fallback
      }
    }

    const html = generateGuestListHTML({
      guests: guestsWithCompanions,
      eventName: event?.name || "Evento",
      eventDate: event?.date || null,
      eventLocation: event?.location || null,
      orgName: org?.name || "",
      orgLogo: logoDataUri,
      stats: {
        total: Number(stats.total),
        confirmed: Number(stats.confirmed),
        pending: Number(stats.pending),
        declined: Number(stats.declined),
        adults: Number(stats.adults),
        children: Number(stats.children),
        babies: Number(stats.babies),
      },
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Guest list PDF generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate PDF";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "PDF_ERROR", message } },
      { status }
    );
  }
}

function generateGuestListHTML(data: {
  guests: GuestRow[];
  eventName: string;
  eventDate: Date | null;
  eventLocation: string | null;
  orgName: string;
  orgLogo?: string;
  stats: {
    total: number;
    confirmed: number;
    pending: number;
    declined: number;
    adults: number;
    children: number;
    babies: number;
  };
}): string {
  const statusLabels: Record<string, string> = {
    confirmed: "Confirmado",
    declined: "Rechazado",
    pending: "Pendiente",
    maybe: "Quizás",
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    confirmed: { bg: "#dcfce7", text: "#166534" },
    declined: { bg: "#fee2e2", text: "#991b1b" },
    pending: { bg: "#fef9c3", text: "#854d0e" },
    maybe: { bg: "#e0e7ff", text: "#3730a3" },
  };

  // Group by groupName
  const byGroup: Record<string, GuestRow[]> = {};
  for (const guest of data.guests) {
    const key = guest.groupName || "Sin grupo";
    if (!byGroup[key]) byGroup[key] = [];
    byGroup[key].push(guest);
  }

  const groupSectionsHTML = Object.entries(byGroup)
    .map(([groupName, groupGuests]) => {
      const rowsHTML = groupGuests
        .map(
          (g) => {
            const st = g.rsvpStatus || "pending";
            const colors = statusColors[st] || statusColors.pending;
            const ageLabel = g.ageGroup === "child" ? " (Niño)" : g.ageGroup === "baby" ? " (Bebé)" : "";
            return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">
            <strong>${g.firstName} ${g.lastName || ""}</strong>${ageLabel}
            ${g.companionCount > 0 ? `<span style="color: #6b7280; font-size: 11px;"> (+${g.companionCount})</span>` : ""}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">${g.email || "—"}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">${g.phone || "—"}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">${g.tableName || "—"}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">${g.menuPreference || "—"}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; background: ${colors.bg}; color: ${colors.text};">
              ${statusLabels[st] || "Pendiente"}
            </span>
          </td>
        </tr>`;
          }
        )
        .join("");

      return `
      <div style="margin-bottom: 20px;">
        <div style="background: #f3f4f6; padding: 8px 12px; border-radius: 6px 6px 0 0; border-bottom: 2px solid #d1d5db;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600;">${groupName} (${groupGuests.length})</h3>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: 6px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb;">Nombre</th>
              <th style="padding: 6px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb;">Email</th>
              <th style="padding: 6px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb;">Teléfono</th>
              <th style="padding: 6px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb; width: 80px;">Mesa</th>
              <th style="padding: 6px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb; width: 90px;">Menú</th>
              <th style="padding: 6px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb; width: 90px;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>`;
    })
    .join("");

  const eventDateStr = data.eventDate
    ? format(new Date(data.eventDate), "dd/MM/yyyy", { locale: es })
    : "";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lista de Invitados — ${data.eventName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #111827;
      background: #ffffff;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 40px;
    }
    @media print {
      .container { padding: 0; max-width: 100%; }
      body { font-size: 11px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #111827;">
      <div>
        ${data.orgLogo ? `<img src="${data.orgLogo}" alt="" style="height: 40px; margin-bottom: 8px;">` : ""}
        <div style="font-size: 12px; color: #6b7280;">${data.orgName}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 22px; font-weight: 700;">Lista de Invitados</div>
        <div style="font-size: 16px; color: #6b7280; margin-top: 2px;">${data.eventName}</div>
      </div>
    </div>

    <!-- Event Info + Stats -->
    <div style="display: flex; gap: 24px; margin-bottom: 28px; padding: 14px 16px; background: #f9fafb; border-radius: 8px; flex-wrap: wrap;">
      ${eventDateStr ? `<div><div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; margin-bottom: 2px;">Fecha</div><div style="font-size: 14px; font-weight: 500;">${eventDateStr}</div></div>` : ""}
      ${data.eventLocation ? `<div><div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; margin-bottom: 2px;">Ubicación</div><div style="font-size: 14px; font-weight: 500;">${data.eventLocation}</div></div>` : ""}
      <div><div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; margin-bottom: 2px;">Total</div><div style="font-size: 14px; font-weight: 600;">${data.stats.total}</div></div>
      <div><div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #16a34a; margin-bottom: 2px;">Confirmados</div><div style="font-size: 14px; font-weight: 600; color: #166534;">${data.stats.confirmed}</div></div>
      <div><div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #ca8a04; margin-bottom: 2px;">Pendientes</div><div style="font-size: 14px; font-weight: 600; color: #854d0e;">${data.stats.pending}</div></div>
      <div><div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #dc2626; margin-bottom: 2px;">Cancelados</div><div style="font-size: 14px; font-weight: 600; color: #991b1b;">${data.stats.declined}</div></div>
      <div><div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; margin-bottom: 2px;">Adultos / Niños / Bebés</div><div style="font-size: 14px; font-weight: 500;">${data.stats.adults} / ${data.stats.children} / ${data.stats.babies}</div></div>
    </div>

    <!-- Guest List by Group -->
    ${groupSectionsHTML}

    <!-- Footer -->
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center;">
      Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })} — ${data.orgName}
    </div>
  </div>
</body>
</html>`;
}
