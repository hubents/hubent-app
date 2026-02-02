import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { financialDocuments, contacts, organizations, organizationFinanceSettings } from "@/db/schema";
import { eq, and, lte, gte, isNotNull } from "drizzle-orm";
import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  return new Resend(apiKey);
}

function getEmailFrom() {
  return process.env.EMAIL_FROM || "HubEnts <noreply@hubents.com>";
}

// GET /api/cron/payment-reminders - Vercel Cron job
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel Cron sends this header)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();
    const results = {
      dueSoon: 0,
      overdue: 0,
      errors: [] as string[],
    };

    // Get all organizations with finance settings
    const orgsWithSettings = await db
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        reminderDays: organizationFinanceSettings.defaultPaymentTerms,
      })
      .from(organizations)
      .leftJoin(
        organizationFinanceSettings,
        eq(organizations.id, organizationFinanceSettings.organizationId)
      );

    for (const org of orgsWithSettings) {
      try {
        // Find invoices due in the next 3 days (reminder before due)
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        
        const dueSoonInvoices = await db
          .select({
            id: financialDocuments.id,
            number: financialDocuments.number,
            total: financialDocuments.total,
            currency: financialDocuments.currency,
            dueDate: financialDocuments.dueDate,
            contactId: financialDocuments.contactId,
            contactName: contacts.name,
            contactEmail: contacts.email,
          })
          .from(financialDocuments)
          .leftJoin(contacts, eq(financialDocuments.contactId, contacts.id))
          .where(
            and(
              eq(financialDocuments.organizationId, org.orgId),
              eq(financialDocuments.type, "invoice"),
              eq(financialDocuments.status, "sent"),
              isNotNull(contacts.email),
              gte(financialDocuments.dueDate, now),
              lte(financialDocuments.dueDate, threeDaysFromNow)
            )
          );

        // Find overdue invoices (past due date)
        const overdueInvoices = await db
          .select({
            id: financialDocuments.id,
            number: financialDocuments.number,
            total: financialDocuments.total,
            currency: financialDocuments.currency,
            dueDate: financialDocuments.dueDate,
            contactId: financialDocuments.contactId,
            contactName: contacts.name,
            contactEmail: contacts.email,
          })
          .from(financialDocuments)
          .leftJoin(contacts, eq(financialDocuments.contactId, contacts.id))
          .where(
            and(
              eq(financialDocuments.organizationId, org.orgId),
              eq(financialDocuments.type, "invoice"),
              eq(financialDocuments.status, "sent"),
              isNotNull(contacts.email),
              lte(financialDocuments.dueDate, now)
            )
          );

        const resend = getResend();
        const emailFrom = getEmailFrom();

        // Send reminders for invoices due soon
        for (const invoice of dueSoonInvoices) {
          if (!invoice.contactEmail) continue;
          
          const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("es-ES") : "N/A";
          const amount = new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: invoice.currency || "EUR",
          }).format(parseFloat(invoice.total || "0"));

          try {
            await resend.emails.send({
              from: emailFrom,
              to: invoice.contactEmail,
              subject: `Recordatorio: Factura ${invoice.number} vence pronto`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1f2937;">Recordatorio de Pago</h2>
                  <p>Estimado/a ${invoice.contactName || "Cliente"},</p>
                  <p>Le recordamos que la factura <strong>${invoice.number}</strong> por un importe de <strong>${amount}</strong> vence el <strong>${dueDate}</strong>.</p>
                  <p>Por favor, realice el pago antes de la fecha de vencimiento para evitar recargos.</p>
                  <p>Si ya ha realizado el pago, por favor ignore este mensaje.</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  <p style="color: #6b7280; font-size: 14px;">Este es un mensaje automático de ${org.orgName}.</p>
                </div>
              `,
            });
            results.dueSoon++;
          } catch (emailError) {
            results.errors.push(`Error sending due soon reminder for ${invoice.number}: ${emailError}`);
          }
        }

        // Send reminders for overdue invoices (only once per week - check if dueDate is multiple of 7 days ago)
        for (const invoice of overdueInvoices) {
          if (!invoice.contactEmail || !invoice.dueDate) continue;
          
          const daysOverdue = Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / (24 * 60 * 60 * 1000));
          
          // Send reminder on day 1, 7, 14, 30, etc.
          if (daysOverdue !== 1 && daysOverdue !== 7 && daysOverdue !== 14 && daysOverdue !== 30 && daysOverdue % 30 !== 0) {
            continue;
          }

          const dueDate = new Date(invoice.dueDate).toLocaleDateString("es-ES");
          const amount = new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: invoice.currency || "EUR",
          }).format(parseFloat(invoice.total || "0"));

          try {
            await resend.emails.send({
              from: emailFrom,
              to: invoice.contactEmail,
              subject: `URGENTE: Factura ${invoice.number} vencida hace ${daysOverdue} días`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #dc2626;">Factura Vencida</h2>
                  <p>Estimado/a ${invoice.contactName || "Cliente"},</p>
                  <p>La factura <strong>${invoice.number}</strong> por un importe de <strong>${amount}</strong> venció el <strong>${dueDate}</strong> (hace ${daysOverdue} días).</p>
                  <p style="color: #dc2626; font-weight: bold;">Por favor, realice el pago a la mayor brevedad posible.</p>
                  <p>Si tiene alguna duda o problema con el pago, no dude en contactarnos.</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  <p style="color: #6b7280; font-size: 14px;">Este es un mensaje automático de ${org.orgName}.</p>
                </div>
              `,
            });
            results.overdue++;
          } catch (emailError) {
            results.errors.push(`Error sending overdue reminder for ${invoice.number}: ${emailError}`);
          }
        }
      } catch (orgError) {
        results.errors.push(`Error processing org ${org.orgId}: ${orgError}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        dueSoonReminders: results.dueSoon,
        overdueReminders: results.overdue,
        errors: results.errors.length > 0 ? results.errors : undefined,
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process payment reminders";
    return NextResponse.json(
      { success: false, error: { code: "CRON_ERROR", message } },
      { status: 500 }
    );
  }
}
