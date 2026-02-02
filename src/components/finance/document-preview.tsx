"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  RiEditLine,
  RiPrinterLine,
  RiMailLine,
  RiDownloadLine,
} from "@remixicon/react";

interface DocumentItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  total: string;
}

interface Document {
  id: number;
  type: string;
  number: string;
  status: string;
  issueDate: string | null;
  dueDate: string | null;
  validUntil: string | null;
  subtotal: string;
  taxAmount: string;
  total: string;
  currency: string;
  notes: string | null;
  termsAndConditions: string | null;
  items: DocumentItem[];
  contactName?: string | null;
  companyName?: string | null;
  personFirstName?: string | null;
  personLastName?: string | null;
  eventName?: string | null;
}

interface DocumentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  onEdit?: () => void;
}

const typeLabels: Record<string, string> = {
  quote: "Presupuesto",
  proforma: "Proforma",
  invoice: "Factura",
  delivery_note: "Albarán",
  credit_note: "Factura Rectificativa",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-800" },
  sent: { label: "Enviado", color: "bg-blue-100 text-blue-800" },
  accepted: { label: "Aceptado", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-800" },
  paid: { label: "Pagado", color: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-500" },
};

export function DocumentPreview({
  open,
  onOpenChange,
  document,
  onEdit,
}: DocumentPreviewProps) {
  if (!document) return null;

  const formatCurrency = (amount: string, currency = "EUR") => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
    }).format(parseFloat(amount || "0"));
  };

  const getClientName = () => {
    if (document.contactName) return document.contactName;
    if (document.companyName) return document.companyName;
    if (document.personFirstName) {
      return `${document.personFirstName} ${document.personLastName || ""}`.trim();
    }
    return "Sin cliente";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">
              {typeLabels[document.type] || document.type} {document.number}
            </SheetTitle>
            <Badge className={statusConfig[document.status]?.color || "bg-gray-100"}>
              {statusConfig[document.status]?.label || document.status}
            </Badge>
          </div>
        </SheetHeader>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <RiEditLine className="h-4 w-4 mr-1" />
              Editar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <RiPrinterLine className="h-4 w-4 mr-1" />
            Imprimir
          </Button>
          <Button variant="outline" size="sm" disabled>
            <RiDownloadLine className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button variant="outline" size="sm" disabled>
            <RiMailLine className="h-4 w-4 mr-1" />
            Enviar
          </Button>
        </div>

        <Separator className="my-4" />

        {/* Document Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Cliente</p>
              <p className="font-medium">{getClientName()}</p>
            </div>
            {document.eventName && (
              <div>
                <p className="text-muted-foreground">Evento</p>
                <p className="font-medium">{document.eventName}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Fecha emisión</p>
              <p className="font-medium">
                {document.issueDate
                  ? format(new Date(document.issueDate), "dd MMM yyyy", { locale: es })
                  : "-"}
              </p>
            </div>
            {document.dueDate && (
              <div>
                <p className="text-muted-foreground">Fecha vencimiento</p>
                <p className="font-medium">
                  {format(new Date(document.dueDate), "dd MMM yyyy", { locale: es })}
                </p>
              </div>
            )}
            {document.validUntil && (
              <div>
                <p className="text-muted-foreground">Válido hasta</p>
                <p className="font-medium">
                  {format(new Date(document.validUntil), "dd MMM yyyy", { locale: es })}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Items Table */}
          <div>
            <h4 className="font-medium mb-2">Líneas</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Descripción</th>
                    <th className="text-right p-2 w-16">Cant.</th>
                    <th className="text-right p-2 w-20">Precio</th>
                    <th className="text-right p-2 w-20">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {document.items.map((item, idx) => (
                    <tr key={item.id || idx} className="border-t">
                      <td className="p-2">{item.description}</td>
                      <td className="text-right p-2">{item.quantity}</td>
                      <td className="text-right p-2">
                        {formatCurrency(item.unitPrice, document.currency)}
                      </td>
                      <td className="text-right p-2">
                        {formatCurrency(item.total, document.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(document.subtotal, document.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA</span>
                <span>{formatCurrency(document.taxAmount, document.currency)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatCurrency(document.total, document.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {document.notes && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-1">Notas</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {document.notes}
                </p>
              </div>
            </>
          )}

          {/* Terms */}
          {document.termsAndConditions && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-1">Términos y Condiciones</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {document.termsAndConditions}
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
