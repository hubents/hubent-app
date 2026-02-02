import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { financialDocuments, documentItems, contacts, organizationFinanceSettings } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

// GET /api/finance/export - Export financial data to CSV
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole("admin");
    const orgId = session.organizationId;
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") || "invoices"; // invoices, expenses, vat
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "csv"; // csv, json

    // Default to current quarter if no dates provided
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const defaultStartDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
    const defaultEndDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;

    // Get organization settings
    const [settings] = await db
      .select()
      .from(organizationFinanceSettings)
      .where(eq(organizationFinanceSettings.organizationId, orgId))
      .limit(1);

    if (type === "vat" || type === "modelo303") {
      // VAT Summary for Modelo 303
      const invoices = await db
        .select({
          id: financialDocuments.id,
          number: financialDocuments.number,
          type: financialDocuments.type,
          status: financialDocuments.status,
          direction: financialDocuments.direction,
          issueDate: financialDocuments.issueDate,
          subtotal: financialDocuments.subtotal,
          taxAmount: financialDocuments.taxAmount,
          total: financialDocuments.total,
          contactName: contacts.name,
          contactTaxId: contacts.taxId,
        })
        .from(financialDocuments)
        .leftJoin(contacts, eq(financialDocuments.contactId, contacts.id))
        .where(
          and(
            eq(financialDocuments.organizationId, orgId),
            gte(financialDocuments.issueDate, start),
            lte(financialDocuments.issueDate, end)
          )
        )
        .orderBy(desc(financialDocuments.issueDate));

      // Calculate VAT summary
      let salesBase = 0;
      let salesVat = 0;
      let purchasesBase = 0;
      let purchasesVat = 0;

      const vatByRate: Record<string, { base: number; vat: number }> = {};

      for (const inv of invoices) {
        const subtotal = parseFloat(inv.subtotal || "0");
        const tax = parseFloat(inv.taxAmount || "0");

        if (inv.type === "invoice" && inv.direction !== "incoming") {
          // Sales (outgoing invoices)
          salesBase += subtotal;
          salesVat += tax;
        } else if (inv.direction === "incoming") {
          // Purchases (incoming invoices)
          purchasesBase += subtotal;
          purchasesVat += tax;
        }
      }

      // Get items for detailed VAT breakdown
      for (const inv of invoices) {
        const items = await db
          .select()
          .from(documentItems)
          .where(eq(documentItems.documentId, inv.id));

        for (const item of items) {
          const rate = item.taxRate || "21";
          const itemTotal = parseFloat(item.total || "0");
          const itemTax = itemTotal * (parseFloat(rate) / 100);

          if (!vatByRate[rate]) {
            vatByRate[rate] = { base: 0, vat: 0 };
          }

          if (inv.type === "invoice" && inv.direction !== "incoming") {
            vatByRate[rate].base += itemTotal;
            vatByRate[rate].vat += itemTax;
          }
        }
      }

      const vatSummary = {
        period: {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
          quarter: `Q${currentQuarter + 1} ${now.getFullYear()}`,
        },
        sales: {
          baseImponible: salesBase,
          cuotaRepercutida: salesVat,
          total: salesBase + salesVat,
        },
        purchases: {
          baseImponible: purchasesBase,
          cuotaDeducible: purchasesVat,
          total: purchasesBase + purchasesVat,
        },
        result: {
          cuotaDiferencial: salesVat - purchasesVat,
          aIngresar: Math.max(0, salesVat - purchasesVat),
          aCompensar: Math.max(0, purchasesVat - salesVat),
        },
        vatByRate: Object.entries(vatByRate).map(([rate, data]) => ({
          rate: `${rate}%`,
          base: data.base,
          vat: data.vat,
        })),
        fiscalData: {
          companyName: settings?.companyName || "",
          taxId: settings?.taxId || "",
          fiscalAddress: settings?.fiscalAddress || "",
        },
      };

      if (format === "json") {
        return NextResponse.json({ success: true, data: vatSummary });
      }

      // Generate CSV for VAT
      const csvLines = [
        "RESUMEN IVA - MODELO 303",
        `Período: ${vatSummary.period.quarter}`,
        `Desde: ${vatSummary.period.start}`,
        `Hasta: ${vatSummary.period.end}`,
        "",
        "EMPRESA",
        `Razón Social: ${vatSummary.fiscalData.companyName}`,
        `NIF/CIF: ${vatSummary.fiscalData.taxId}`,
        `Domicilio Fiscal: ${vatSummary.fiscalData.fiscalAddress}`,
        "",
        "IVA REPERCUTIDO (VENTAS)",
        `Base Imponible: ${vatSummary.sales.baseImponible.toFixed(2)}`,
        `Cuota Repercutida: ${vatSummary.sales.cuotaRepercutida.toFixed(2)}`,
        "",
        "DESGLOSE POR TIPO DE IVA",
        "Tipo,Base Imponible,Cuota",
        ...vatSummary.vatByRate.map(v => `${v.rate},${v.base.toFixed(2)},${v.vat.toFixed(2)}`),
        "",
        "IVA SOPORTADO (COMPRAS)",
        `Base Imponible: ${vatSummary.purchases.baseImponible.toFixed(2)}`,
        `Cuota Deducible: ${vatSummary.purchases.cuotaDeducible.toFixed(2)}`,
        "",
        "RESULTADO",
        `Cuota Diferencial: ${vatSummary.result.cuotaDiferencial.toFixed(2)}`,
        `A Ingresar: ${vatSummary.result.aIngresar.toFixed(2)}`,
        `A Compensar: ${vatSummary.result.aCompensar.toFixed(2)}`,
      ];

      return new NextResponse(csvLines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="modelo303_${vatSummary.period.quarter.replace(" ", "_")}.csv"`,
        },
      });
    }

    // Export invoices or expenses
    const isExpenses = type === "expenses";
    
    const documents = await db
      .select({
        id: financialDocuments.id,
        number: financialDocuments.number,
        type: financialDocuments.type,
        status: financialDocuments.status,
        direction: financialDocuments.direction,
        issueDate: financialDocuments.issueDate,
        dueDate: financialDocuments.dueDate,
        paidAt: financialDocuments.paidAt,
        subtotal: financialDocuments.subtotal,
        taxAmount: financialDocuments.taxAmount,
        total: financialDocuments.total,
        currency: financialDocuments.currency,
        contactName: contacts.name,
        contactTaxId: contacts.taxId,
        contactEmail: contacts.email,
      })
      .from(financialDocuments)
      .leftJoin(contacts, eq(financialDocuments.contactId, contacts.id))
      .where(
        and(
          eq(financialDocuments.organizationId, orgId),
          eq(financialDocuments.type, "invoice"),
          isExpenses ? eq(financialDocuments.direction, "incoming") : undefined,
          gte(financialDocuments.issueDate, start),
          lte(financialDocuments.issueDate, end)
        )
      )
      .orderBy(desc(financialDocuments.issueDate));

    if (format === "json") {
      return NextResponse.json({ success: true, data: documents });
    }

    // Generate CSV
    const headers = [
      "Número",
      "Fecha Emisión",
      "Fecha Vencimiento",
      "Fecha Pago",
      "Cliente/Proveedor",
      "NIF/CIF",
      "Email",
      "Base Imponible",
      "IVA",
      "Total",
      "Moneda",
      "Estado",
    ];

    const rows = documents.map(doc => [
      doc.number,
      doc.issueDate ? new Date(doc.issueDate).toLocaleDateString("es-ES") : "",
      doc.dueDate ? new Date(doc.dueDate).toLocaleDateString("es-ES") : "",
      doc.paidAt ? new Date(doc.paidAt).toLocaleDateString("es-ES") : "",
      doc.contactName || "",
      doc.contactTaxId || "",
      doc.contactEmail || "",
      parseFloat(doc.subtotal || "0").toFixed(2),
      parseFloat(doc.taxAmount || "0").toFixed(2),
      parseFloat(doc.total || "0").toFixed(2),
      doc.currency || "EUR",
      doc.status || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const filename = isExpenses 
      ? `gastos_${start.toISOString().split("T")[0]}_${end.toISOString().split("T")[0]}.csv`
      : `facturas_${start.toISOString().split("T")[0]}_${end.toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export data";
    return NextResponse.json(
      { success: false, error: { code: "EXPORT_ERROR", message } },
      { status: 500 }
    );
  }
}
