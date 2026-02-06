"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DocumentItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
}

interface PreviewData {
  type: "quote" | "invoice" | "proforma" | "delivery_note" | "credit_note";
  contactName?: string;
  vendorName?: string;
  eventName?: string;
  items: DocumentItem[];
  notes?: string;
  termsAndConditions?: string;
  dueDate?: string;
  validUntil?: string;
}

interface LiveDocumentPreviewProps {
  data: PreviewData;
  organizationName?: string;
}

const TYPE_LABELS: Record<string, string> = {
  quote: "PRESUPUESTO",
  proforma: "PROFORMA",
  invoice: "FACTURA",
  delivery_note: "ALBARÁN",
  credit_note: "FACTURA RECTIFICATIVA",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(date: string | undefined): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "dd/MM/yyyy", { locale: es });
  } catch {
    return "-";
  }
}

export function LiveDocumentPreview({ data, organizationName }: LiveDocumentPreviewProps) {
  const totals = useMemo(() => {
    let subtotal = 0;
    let taxAmount = 0;

    data.items.forEach((item) => {
      subtotal += item.total;
      taxAmount += item.total * (item.taxRate / 100);
    });

    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  }, [data.items]);

  const typeLabel = TYPE_LABELS[data.type] || data.type.toUpperCase();
  const clientName = data.contactName || data.vendorName || "Sin cliente";
  const hasValidItems = data.items.some((item) => item.description.trim());

  return (
    <div className="h-full overflow-auto bg-gray-100 p-4">
      <div 
        id="document-preview-content"
        className="mx-auto bg-white shadow-lg rounded-lg overflow-hidden"
        style={{ maxWidth: "210mm", minHeight: "297mm" }}
      >
        <div className="p-8" style={{ fontSize: "12px", lineHeight: "1.5" }}>
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-900">
            <div>
              <div className="text-2xl font-bold mb-2">
                {organizationName || "hubents"}
              </div>
              <div className="text-gray-500 text-xs">
                <div>Tu organización</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{typeLabel}</div>
              <div className="text-gray-500">BORRADOR</div>
              <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                Borrador
              </span>
            </div>
          </div>

          {/* Parties */}
          <div className="flex justify-between mb-8">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                Cliente
              </div>
              <div className="font-semibold text-base">
                {clientName}
              </div>
            </div>
            {data.eventName && (
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                  Evento
                </div>
                <div className="font-semibold">{data.eventName}</div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="flex gap-8 mb-8 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                Fecha de emisión
              </div>
              <div className="font-medium">
                {format(new Date(), "dd/MM/yyyy", { locale: es })}
              </div>
            </div>
            {data.type === "quote" && data.validUntil && (
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                  Válido hasta
                </div>
                <div className="font-medium">{formatDate(data.validUntil)}</div>
              </div>
            )}
            {data.type !== "quote" && data.dueDate && (
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                  Fecha de vencimiento
                </div>
                <div className="font-medium">{formatDate(data.dueDate)}</div>
              </div>
            )}
          </div>

          {/* Items Table */}
          <table className="w-full mb-6">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 text-xs uppercase tracking-wider text-gray-500 border-b-2 border-gray-200">
                  Descripción
                </th>
                <th className="text-center p-3 text-xs uppercase tracking-wider text-gray-500 border-b-2 border-gray-200">
                  Cant.
                </th>
                <th className="text-right p-3 text-xs uppercase tracking-wider text-gray-500 border-b-2 border-gray-200">
                  Precio
                </th>
                <th className="text-center p-3 text-xs uppercase tracking-wider text-gray-500 border-b-2 border-gray-200">
                  Dto.
                </th>
                <th className="text-center p-3 text-xs uppercase tracking-wider text-gray-500 border-b-2 border-gray-200">
                  IVA
                </th>
                <th className="text-right p-3 text-xs uppercase tracking-wider text-gray-500 border-b-2 border-gray-200">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {hasValidItems ? (
                data.items
                  .filter((item) => item.description.trim())
                  .map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="p-3">{item.description}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-center">{item.discount}%</td>
                      <td className="p-3 text-center">{item.taxRate}%</td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Añade líneas para ver el preview
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-500">IVA</span>
                <span>{formatCurrency(totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between py-3 mt-2 border-t-2 border-gray-900 font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {data.notes && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                Notas
              </div>
              <div className="text-gray-600 whitespace-pre-wrap text-sm">
                {data.notes}
              </div>
            </div>
          )}

          {/* Terms */}
          {data.termsAndConditions && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                Términos y Condiciones
              </div>
              <div className="text-gray-600 whitespace-pre-wrap text-sm">
                {data.termsAndConditions}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
            Vista previa • Los datos finales pueden variar
          </div>
        </div>
      </div>
    </div>
  );
}
