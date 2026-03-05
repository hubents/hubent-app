import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import {
  providerEventAccess,
  tasks,
  taskParticipants,
  taskScheduleItems,
  vendors,
  events,
  organizations,
} from "@/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { createPDF } from "@/lib/pdf-generator";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type RouteParams = { params: Promise<{ accessId: string }> };

interface ScheduleRow {
  id: number;
  title: string;
  description: string | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  taskTitle: string;
}

/**
 * GET /api/vendor/events/[accessId]/run-sheet/pdf
 * Generate PDF of schedule items for provider's tasks in this event.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { accessId } = await params;
    const aid = parseInt(accessId, 10);

    // Verify access belongs to this provider org
    const access = await db.query.providerEventAccess.findFirst({
      where: and(
        eq(providerEventAccess.id, aid),
        eq(providerEventAccess.providerOrgId, session.organizationId)
      ),
    });

    if (!access) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Access not found" } },
        { status: 404 }
      );
    }

    // Find vendor IDs linked to this provider org
    const linkedVendors = await db
      .select({ id: vendors.id, name: vendors.name })
      .from(vendors)
      .where(
        and(
          eq(vendors.organizationId, access.plannerOrgId),
          eq(vendors.providerOrgId, session.organizationId)
        )
      );

    const vendorIds = linkedVendors.map((v) => v.id);
    const providerName = linkedVendors[0]?.name || "Proveedor";

    if (vendorIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NO_VENDORS", message: "No linked vendors" } },
        { status: 404 }
      );
    }

    // Find task IDs where vendor is a participant
    const participations = await db
      .select({ taskId: taskParticipants.taskId })
      .from(taskParticipants)
      .where(inArray(taskParticipants.vendorId, vendorIds));

    const taskIds = [...new Set(participations.map((p) => p.taskId))];

    // Get schedule items
    let items: ScheduleRow[] = [];
    if (taskIds.length > 0) {
      const rawItems = await db
        .select({
          id: taskScheduleItems.id,
          title: taskScheduleItems.title,
          description: taskScheduleItems.description,
          date: taskScheduleItems.date,
          startTime: taskScheduleItems.startTime,
          endTime: taskScheduleItems.endTime,
          location: taskScheduleItems.location,
          notes: taskScheduleItems.notes,
          taskTitle: tasks.title,
        })
        .from(taskScheduleItems)
        .innerJoin(tasks, eq(taskScheduleItems.taskId, tasks.id))
        .where(
          and(
            eq(tasks.eventId, access.eventId),
            inArray(tasks.id, taskIds)
          )
        )
        .orderBy(asc(taskScheduleItems.date), asc(taskScheduleItems.sortOrder));

      items = rawItems;
    }

    // Fetch event info
    const [event] = await db
      .select({ name: events.name, date: events.date, location: events.location })
      .from(events)
      .where(eq(events.id, access.eventId))
      .limit(1);

    // Fetch planner org info (the org that owns the event)
    const [plannerOrg] = await db
      .select({
        name: organizations.name,
        logo: organizations.logo,
        invoiceLogo: organizations.invoiceLogo,
      })
      .from(organizations)
      .where(eq(organizations.id, access.plannerOrgId))
      .limit(1);

    // Convert logo to base64
    let logoDataUri: string | undefined = plannerOrg?.invoiceLogo || plannerOrg?.logo || undefined;
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

    // Generate HTML
    const html = generateVendorRunSheetHTML({
      items,
      eventName: event?.name || "Evento",
      eventDate: event?.date || null,
      eventLocation: event?.location || null,
      plannerOrgName: plannerOrg?.name || "",
      plannerOrgLogo: logoDataUri,
      providerName,
    });

    // Generate PDF
    const { buffer, isPDF } = await createPDF(html);

    const eventSlug = (event?.name || "evento")
      .replace(/\s+/g, "-")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    const filename = `orden-del-dia-${eventSlug}-${providerName.replace(/\s+/g, "-").toLowerCase()}.pdf`;

    if (isPDF) {
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Fallback to HTML
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename.replace(".pdf", ".html")}"`,
      },
    });
  } catch (error) {
    console.error("Vendor run sheet PDF error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate PDF";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "PDF_ERROR", message } },
      { status }
    );
  }
}

// ============================================
// HTML Template for vendor run sheet
// ============================================

function generateVendorRunSheetHTML(data: {
  items: ScheduleRow[];
  eventName: string;
  eventDate: Date | null;
  eventLocation: string | null;
  plannerOrgName: string;
  plannerOrgLogo?: string;
  providerName: string;
}): string {
  // Group by date
  const byDate: Record<string, ScheduleRow[]> = {};
  for (const item of data.items) {
    const key = new Date(item.date).toISOString().split("T")[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(item);
  }

  Object.values(byDate).forEach((arr) =>
    arr.sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"))
  );

  const sortedDates = Object.keys(byDate).sort();

  const datesSectionsHTML = sortedDates
    .map((dateKey) => {
      const items = byDate[dateKey];
      const dateObj = new Date(dateKey + "T12:00:00");
      const dateLabel = format(dateObj, "EEEE d 'de' MMMM, yyyy", { locale: es });

      const rowsHTML = items
        .map(
          (item) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; white-space: nowrap; vertical-align: top; width: 100px;">
            <strong style="font-size: 14px;">${item.startTime || "—"}</strong>
            ${item.endTime ? `<br><span style="color: #9ca3af; font-size: 12px;">→ ${item.endTime}</span>` : ""}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
            <strong style="font-size: 14px;">${item.title}</strong>
            ${item.description ? `<br><span style="color: #6b7280; font-size: 12px;">${item.description}</span>` : ""}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 12px; color: #6b7280;">
            ${item.location || "—"}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; background: #fffbeb; color: #d97706;">
              ${item.taskTitle}
            </span>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 12px; color: #6b7280;">
            ${item.notes || ""}
          </td>
        </tr>`
        )
        .join("");

      return `
        <div style="margin-bottom: 24px;">
          <div style="background: #f9fafb; padding: 10px 16px; border-radius: 8px 8px 0 0; border-bottom: 2px solid #e5e7eb;">
            <h3 style="margin: 0; font-size: 15px; font-weight: 600; text-transform: capitalize;">
              📅 ${dateLabel}
            </h3>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb; width: 100px;">Hora</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb;">Actividad</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb; width: 140px;">Ubicación</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb; width: 110px;">Tarea</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb; width: 160px;">Notas</th>
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
  <title>Orden del día — ${data.providerName}</title>
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
        ${data.plannerOrgLogo ? `<img src="${data.plannerOrgLogo}" alt="" style="height: 40px; margin-bottom: 8px;">` : ""}
        <div style="font-size: 12px; color: #6b7280;">${data.plannerOrgName}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 22px; font-weight: 700;">Orden del día</div>
        <div style="font-size: 16px; font-weight: 600; color: #d97706; margin-top: 2px;">${data.providerName}</div>
        <div style="font-size: 13px; color: #6b7280; margin-top: 2px;">${data.eventName}</div>
      </div>
    </div>

    <!-- Event Info -->
    <div style="display: flex; gap: 32px; margin-bottom: 28px; padding: 14px 16px; background: #f9fafb; border-radius: 8px;">
      ${eventDateStr ? `<div><div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; margin-bottom: 2px;">Fecha del evento</div><div style="font-size: 14px; font-weight: 500;">${eventDateStr}</div></div>` : ""}
      ${data.eventLocation ? `<div><div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; margin-bottom: 2px;">Ubicación</div><div style="font-size: 14px; font-weight: 500;">${data.eventLocation}</div></div>` : ""}
      <div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; margin-bottom: 2px;">Total items</div>
        <div style="font-size: 14px; font-weight: 500;">${data.items.length}</div>
      </div>
    </div>

    <!-- Timeline by date -->
    ${datesSectionsHTML || '<p style="text-align: center; color: #9ca3af; padding: 40px 0;">No hay items en la orden del día</p>'}

    <!-- Footer -->
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center;">
      Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })} — ${data.plannerOrgName}
    </div>
  </div>
</body>
</html>`;
}
