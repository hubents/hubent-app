import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import {
  eventScheduleItems,
  tasks,
  taskScheduleItems,
  events,
  organizations,
  vendors,
} from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type RouteParams = { params: Promise<{ eventId: string }> };

function parseEventId(str: string): number | null {
  const n = parseInt(str, 10);
  return isNaN(n) ? null : n;
}

interface ScheduleRow {
  id: number;
  title: string;
  description: string | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  source: "event" | "task";
  taskTitle: string | null;
  taskId: number | null;
  vendorId: number | null;
  vendorName: string | null;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId: eventIdStr } = await params;
    const eventId = parseEventId(eventIdStr);
    if (!eventId)
      return NextResponse.json(
        { success: false, error: "Invalid eventId" },
        { status: 400 }
      );
    const session = await requireEventSectionAccess(eventId, "general", "view");

    const { searchParams } = new URL(request.url);
    const filterTaskId = searchParams.get("taskId");
    const filterVendorId = searchParams.get("vendorId");

    // Fetch event info
    const [event] = await db
      .select({ name: events.name, date: events.date, location: events.location })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    // Fetch org info
    const [org] = await db
      .select({
        name: organizations.name,
        logo: organizations.logo,
        invoiceLogo: organizations.invoiceLogo,
        phone: organizations.phone,
      })
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1);

    // Fetch event-level schedule items (skip if filtering by taskId)
    let eventItems: ScheduleRow[] = [];
    if (!filterTaskId) {
      const rawEventItems = await db
        .select()
        .from(eventScheduleItems)
        .where(
          and(
            eq(eventScheduleItems.eventId, eventId),
            eq(eventScheduleItems.organizationId, session.organizationId)
          )
        )
        .orderBy(asc(eventScheduleItems.date), asc(eventScheduleItems.sortOrder));

      eventItems = rawEventItems.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        location: item.location,
        notes: item.notes,
        source: "event" as const,
        taskTitle: null,
        taskId: null,
        vendorId: null,
        vendorName: null,
      }));
    }

    // Fetch task schedule items
    const taskQuery = db
      .select({
        id: taskScheduleItems.id,
        taskId: taskScheduleItems.taskId,
        vendorId: taskScheduleItems.vendorId,
        title: taskScheduleItems.title,
        description: taskScheduleItems.description,
        date: taskScheduleItems.date,
        startTime: taskScheduleItems.startTime,
        endTime: taskScheduleItems.endTime,
        location: taskScheduleItems.location,
        notes: taskScheduleItems.notes,
        sortOrder: taskScheduleItems.sortOrder,
        taskTitle: tasks.title,
        vendorName: vendors.name,
      })
      .from(taskScheduleItems)
      .innerJoin(tasks, eq(taskScheduleItems.taskId, tasks.id))
      .leftJoin(vendors, eq(taskScheduleItems.vendorId, vendors.id))
      .where(
        and(
          eq(tasks.eventId, eventId),
          eq(tasks.organizationId, session.organizationId),
          ...(filterTaskId
            ? [eq(taskScheduleItems.taskId, parseInt(filterTaskId, 10))]
            : []),
          ...(filterVendorId
            ? [eq(taskScheduleItems.vendorId, parseInt(filterVendorId, 10))]
            : [])
        )
      )
      .orderBy(asc(taskScheduleItems.date), asc(taskScheduleItems.sortOrder));

    const rawTaskItems = await taskQuery;

    const taskItems: ScheduleRow[] = rawTaskItems.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location,
      notes: item.notes,
      source: "task" as const,
      taskTitle: item.taskTitle,
      taskId: item.taskId,
      vendorId: item.vendorId,
      vendorName: item.vendorName,
    }));

    // Combine and sort
    const allItems = [...eventItems, ...taskItems].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Convert logo to base64
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

    // Determine filter label for PDF title
    let filterLabel: string | null = null;
    if (filterTaskId) {
      filterLabel = rawTaskItems[0]?.taskTitle || null;
    } else if (filterVendorId) {
      filterLabel = rawTaskItems[0]?.vendorName || null;
    }

    // When filtering by vendor, also exclude event items (they don't have vendors)
    const finalItems = filterVendorId ? allItems.filter((i) => i.source === "task") : allItems;

    // Generate HTML
    const html = generateRunSheetHTML({
      items: finalItems,
      eventName: event?.name || "Evento",
      eventDate: event?.date || null,
      eventLocation: event?.location || null,
      orgName: org?.name || "",
      orgLogo: logoDataUri,
      filterLabel,
      filterType: filterTaskId ? "task" : filterVendorId ? "vendor" : null,
    });

    // Return HTML for client-side PDF generation (html2canvas + jsPDF)
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Run sheet PDF generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate PDF";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : 500;
    return NextResponse.json(
      { success: false, error: { code: "PDF_ERROR", message } },
      { status }
    );
  }
}

// ============================================
// HTML Template
// ============================================

function generateRunSheetHTML(data: {
  items: ScheduleRow[];
  eventName: string;
  eventDate: Date | null;
  eventLocation: string | null;
  orgName: string;
  orgLogo?: string;
  filterLabel: string | null;
  filterType: "task" | "vendor" | null;
}): string {
  // Group by date
  const byDate: Record<string, ScheduleRow[]> = {};
  for (const item of data.items) {
    const key = new Date(item.date).toISOString().split("T")[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(item);
  }

  // Sort within each date
  Object.values(byDate).forEach((arr) =>
    arr.sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"))
  );

  const sortedDates = Object.keys(byDate).sort();

  const title = data.filterLabel
    ? `Orden del día — ${data.filterLabel}`
    : "Orden del día";

  const datesSectionsHTML = sortedDates
    .map((dateKey) => {
      const items = byDate[dateKey];
      const dateObj = new Date(dateKey + "T12:00:00");
      const dateLabel = format(dateObj, "EEEE d 'de' MMMM, yyyy", {
        locale: es,
      });

      const rowsHTML = items
        .map(
          (item) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; white-space: nowrap; vertical-align: top; width: 90px;">
            <strong style="font-size: 14px;">${item.startTime || "—"}</strong>
            ${item.endTime ? `<br><span style="color: #9ca3af; font-size: 12px;">→ ${item.endTime}</span>` : ""}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
            <strong style="font-size: 14px;">${item.title}</strong>
            ${item.description ? `<br><span style="color: #6b7280; font-size: 12px;">${item.description}</span>` : ""}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 12px; color: #374151; font-weight: 500;">
            ${item.vendorName || "—"}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 12px; color: #6b7280;">
            ${item.location || "—"}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; background: ${item.source === "event" ? "#eef2ff" : "#fffbeb"}; color: ${item.source === "event" ? "#4f46e5" : "#d97706"};">
              ${item.source === "event" ? "General" : (item.taskTitle || "Tarea")}
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
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb; width: 90px;">Hora</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb;">Actividad</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb; width: 120px;">Proveedor</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb; width: 120px;">Ubicación</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb; width: 100px;">Origen</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; border-bottom: 1px solid #e5e7eb; width: 140px;">Notas</th>
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
  <title>${title} — ${data.eventName}</title>
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
        <div style="font-size: 22px; font-weight: 700;">${title}</div>
        <div style="font-size: 16px; color: #6b7280; margin-top: 2px;">${data.eventName}</div>
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
    ${datesSectionsHTML}

    <!-- Footer -->
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center;">
      Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })} — ${data.orgName}
    </div>
  </div>
</body>
</html>`;
}
