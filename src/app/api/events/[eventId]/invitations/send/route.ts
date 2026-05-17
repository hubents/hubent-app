import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, guests } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { Resend } from "resend";
import { requireEventSectionAccess } from "@/lib/session";

type RouteParams = { params: Promise<{ eventId: string }> };

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

function getEmailFrom() {
  return process.env.EMAIL_FROM || "Hubents <noreply@hubents.com>";
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://app.hubents.com";
}

// POST /api/events/[eventId]/invitations/send - Send invitations to guests
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const body = await request.json();

    const { guestIds, customMessage } = body;

    if (!guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "guestIds array is required" },
        { status: 400 }
      );
    }

    // Get event details
    const eventData = await db
      .select()
      .from(events)
      .where(eq(events.id, eventIdNum))
      .limit(1);

    if (eventData.length === 0) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    const event = eventData[0];

    // Get guests to invite
    const guestsToInvite = await db
      .select()
      .from(guests)
      .where(and(eq(guests.eventId, eventIdNum), inArray(guests.id, guestIds)));

    if (guestsToInvite.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid guests found" },
        { status: 400 }
      );
    }

    const resend = getResendClient();
    const appUrl = getAppUrl();
    const emailFrom = getEmailFrom();
    const rsvpBaseUrl = `${appUrl}/rsvp/${eventIdNum}`;

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send emails to each guest
    for (const guest of guestsToInvite) {
      if (!guest.email) {
        results.failed++;
        results.errors.push(`${guest.firstName}: No email address`);
        continue;
      }

      const eventDate = event.date
        ? new Date(event.date).toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "Fecha por confirmar";

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a ${event.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">¡Estás invitado!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hola <strong>${guest.firstName}</strong>,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Te invitamos cordialmente a:
              </p>
              
              <!-- Event Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="color: #111827; margin: 0 0 16px; font-size: 22px;">${event.name}</h2>
                    
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">📅 ${eventDate}</span>
                        </td>
                      </tr>
                      ${event.location ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">📍 ${event.location}</span>
                        </td>
                      </tr>
                      ` : ""}
                    </table>
                  </td>
                </tr>
              </table>
              
              ${customMessage ? `
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                ${customMessage}
              </p>
              ` : ""}
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${rsvpBaseUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Confirmar Asistencia
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0; text-align: center;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                <a href="${rsvpBaseUrl}" style="color: #6366f1;">${rsvpBaseUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Enviado con ❤️ desde <strong>hubents</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      try {
        await resend.emails.send({
          from: emailFrom,
          to: guest.email,
          subject: `Invitación: ${event.name}`,
          html: emailHtml,
        });
        results.sent++;
      } catch (emailError) {
        results.failed++;
        results.errors.push(`${guest.firstName}: ${emailError instanceof Error ? emailError.message : "Error desconocido"}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error sending invitations:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to send invitations" },
      { status: 500 }
    );
  }
}
