import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { taskScheduleItems, tasks, events, organizations } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { createPDF } from "@/lib/pdf-generator";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type RouteParams = { params: Promise<{ taskId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("tasks:read");
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);

    // Verify task belongs to organization
    const task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) =>
        and(eq(t.id, taskIdNum), eq(t.organizationId, session.organizationId)),
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    // Fetch schedule items
    const scheduleItems = await db
      .select()
      .from(taskScheduleItems)
      .where(eq(taskScheduleItems.taskId, taskIdNum))
      .orderBy(asc(taskScheduleItems.date), asc(taskScheduleItems.sortOrder));

    // Fetch event info if task has eventId
    let eventName: string | null = null;
    let eventDate: Date | null = null;
    let eventLocation: string | null = null;
    if (task.eventId) {
      const [event] = await db
        .select({ name: events.name, date: events.date, location: events.location })
        .from(events)
        .where(eq(events.id, task.eventId))
        .limit(1);
      if (event) {
        eventName = event.name;
        eventDate = event.date;
        eventLocation = event.location;
      }
    }

    // Fetch org info
    const [org] = await db
      .select({
        name: organizations.name,
        logo: organizations.logo,
        invoiceLogo: organizations.invoiceLogo,
      })
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1);

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

    // Generate HTML
    const html = generateTaskScheduleHTML({
      items: scheduleItems,
      taskTitle: task.title,
      eventName,
      eventDate,
      eventLocation,
      orgName: org?.name || "",
      orgLogo: logoDataUri,
    });

    // Generate PDF
    const { buffer, isPDF } = await createPDF(html);

    const taskSlug = task.title
      .replace(/\s+/g, "-")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    const filename = `orden-del-dia-${taskSlug}.pdf`;

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
    console.error("Task schedule PDF generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate PDF";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "PDF_ERROR", message } },
      { status }
    );
  }
}

// ============================================
// HTML Template for task schedule
// ============================================

function generateTaskScheduleHTML(data: {
  items: typeof taskScheduleItems.$inferSelect[];
  taskTitle: string;
  eventName: string | null;
  eventDate: Date | null;
  eventLocation: string | null;
  orgName: string;
  orgLogo?: string;
}): string {
  // Group by date
  const byDate: Record<string, typeof data.items> = {};
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
  <title>Orden del día — ${data.taskTitle}</title>
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
        <div style="font-size: 22px; font-weight: 700;">Orden del día</div>
        <div style="font-size: 16px; font-weight: 600; color: #d97706; margin-top: 2px;">${data.taskTitle}</div>
        ${data.eventName ? `<div style="font-size: 13px; color: #6b7280; margin-top: 2px;">${data.eventName}</div>` : ""}
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
      Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })} — ${data.orgName}
    </div>
  </div>
</body>
</html>`;
}
