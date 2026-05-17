"use client";

import { useMemo, useRef, useLayoutEffect, useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { fmtMoney } from "@/lib/format";

interface DocumentItem {
  description: string;
  details?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
}

export interface OrganizationPreviewData {
  name?: string;
  taxId?: string;
  fiscalAddress?: string;
  fiscalCity?: string;
  fiscalPostalCode?: string;
  fiscalCountry?: string;
  fiscalEmail?: string;
  fiscalPhone?: string;
  invoiceLogo?: string;
}

export interface PreviewData {
  type: "quote" | "invoice" | "proforma" | "delivery_note" | "credit_note";
  contactName?: string;
  vendorName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  contactTaxId?: string;
  eventName?: string;
  documentNumber?: string;
  documentId?: number;
  status?: string;
  items: DocumentItem[];
  notes?: string;
  termsAndConditions?: string;
  issueDate?: string;
  dueDate?: string;
  validUntil?: string;
  currency?: string;
  organization?: OrganizationPreviewData;
  globalDiscount?: number;
  globalDiscountType?: "percentage" | "fixed";
  globalDiscountEnabled?: boolean;
  globalSurcharge?: number;
  globalSurchargeType?: "percentage" | "fixed";
  paymentMethod?: string;
}

interface LiveDocumentPreviewProps {
  data: PreviewData;
  organizationName?: string;
  bare?: boolean;
}

// Layout for a single rendered page
interface PageLayout {
  itemStartIdx: number; // index into validItems
  itemEndIdx: number;   // exclusive
  showTotals: boolean;
  showPayment: boolean;
  showNotes: boolean;
  showTerms: boolean;
  pageNum: number;
  totalPages: number;
}

const TYPE_LABELS: Record<string, string> = {
  quote: "PRESUPUESTO",
  proforma: "PROFORMA",
  invoice: "FACTURA",
  delivery_note: "ALBARÁN",
  credit_note: "FACTURA RECTIFICATIVA",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  approved: "Aprobado",
  sent: "Pendiente",
  accepted: "Aceptado",
  rejected: "Rechazado",
  payment_promise: "Promesa de pago",
  paid: "Pagado",
  partial: "Parcial",
  overdue: "Vencido",
  cancelled: "Cancelado",
  delivered: "Entregado",
};

function formatCurrency(amount: number, currency = "EUR"): string {
  return fmtMoney(amount, currency || "EUR");
}

function formatDate(date: string | undefined): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "dd/MM/yyyy", { locale: es });
  } catch {
    return "-";
  }
}

export function LiveDocumentPreview({ data, organizationName, bare }: LiveDocumentPreviewProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pageHeightPx, setPageHeightPx] = useState(0);
  const [pages, setPages] = useState<PageLayout[]>([]);
  const [scrollContainerH, setScrollContainerH] = useState(0);

  const { totals, adjustedItems } = useMemo(() => {
    let subtotal = 0;
    let taxAmount = 0;
    data.items.forEach((item) => { subtotal += item.total; });

    let globalSurchargeAmount = 0;
    if (data.globalSurcharge && data.globalSurcharge > 0) {
      globalSurchargeAmount = data.globalSurchargeType === "percentage"
        ? subtotal * (data.globalSurcharge / 100)
        : data.globalSurcharge;
    }

    const adjusted = data.items.map((item) => {
      const proportion = subtotal > 0 ? item.total / subtotal : 0;
      const displayTotal = item.total + proportion * globalSurchargeAmount;
      const divisor = item.quantity * (1 - item.discount / 100);
      const displayUnitPrice = divisor > 0 ? displayTotal / divisor : item.unitPrice;
      return { ...item, displayTotal, displayUnitPrice };
    });

    const adjustedSubtotal = subtotal + globalSurchargeAmount;
    let globalDiscountAmount = 0;
    if (data.globalDiscountEnabled && data.globalDiscount && data.globalDiscount > 0) {
      globalDiscountAmount = data.globalDiscountType === "percentage"
        ? adjustedSubtotal * (data.globalDiscount / 100)
        : data.globalDiscount;
    }
    const subtotalAfterDiscount = adjustedSubtotal - globalDiscountAmount;
    data.items.forEach((item) => {
      const proportion = subtotal > 0 ? item.total / subtotal : 0;
      taxAmount += subtotalAfterDiscount * proportion * (item.taxRate / 100);
    });

    return {
      totals: { subtotal: adjustedSubtotal, globalDiscountAmount, subtotalAfterDiscount, taxAmount, total: subtotalAfterDiscount + taxAmount },
      adjustedItems: adjusted,
    };
  }, [data.items, data.globalDiscount, data.globalDiscountType, data.globalDiscountEnabled, data.globalSurcharge, data.globalSurchargeType]);

  const validItems = useMemo(
    () => adjustedItems.filter((item) => item.description.trim()),
    [adjustedItems],
  );

  // Measure section heights and compute page layout
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    if (w === 0) return;

    const ph = Math.round(w * (297 / 210));
    setPageHeightPx(ph);

    const getH = (sel: string) => (el.querySelector(sel) as HTMLElement | null)?.offsetHeight ?? 0;

    const hPageHeader = getH('[data-ms="page-header"]');
    const hThead     = getH('[data-ms="thead"]');
    const hTotals    = getH('[data-ms="totals"]');
    const hPayment   = data.paymentMethod ? getH('[data-ms="payment"]') : 0;
    const hNotes     = data.notes         ? getH('[data-ms="notes"]')   : 0;
    const hTerms     = data.termsAndConditions ? getH('[data-ms="terms"]') : 0;

    const itemHeights = validItems.map((_, i) =>
      (el.querySelector(`[data-mi="${i}"]`) as HTMLElement | null)?.offsetHeight ?? 42,
    );

    // Overhead per page: padding (64) + repeating header + thead
    const PAD = 64;
    const overhead = PAD + hPageHeader + hThead + 24; // 24px for small gaps

    // Space reserved on the last page for totals/notes/payment/terms
    const tailH = hTotals + hPayment + hNotes + hTerms + 32;

    // Build pages greedily
    const layouts: PageLayout[] = [];
    let idx = 0;

    while (idx < validItems.length || layouts.length === 0) {
      const avail = ph - overhead;
      const start = idx;
      let used = 0;

      while (idx < validItems.length) {
        const h = itemHeights[idx] ?? 42;
        // Reserve tail space when placing the last item onto this page
        const wouldBeLast = idx + 1 >= validItems.length;
        const tailReserve = wouldBeLast ? tailH : 0;
        if (used + h + tailReserve > avail && idx > start) break;
        used += h;
        idx++;
      }

      const isLast = idx >= validItems.length;
      const tailFits = isLast && (avail - used) >= tailH;

      layouts.push({
        itemStartIdx: start,
        itemEndIdx: idx,
        showTotals:  isLast,
        showPayment: isLast && !!data.paymentMethod,
        showNotes:   isLast && !!data.notes,
        showTerms:   isLast && !!data.termsAndConditions,
        pageNum: layouts.length + 1,
        totalPages: 0,
      });

      if (isLast) break;
    }

    const total = layouts.length;
    layouts.forEach((p, i) => { p.pageNum = i + 1; p.totalPages = total; });
    setPages(layouts);
  }, [
    validItems, totals,
    data.notes, data.termsAndConditions, data.paymentMethod,
    data.globalDiscountEnabled, data.globalSurcharge, data.globalDiscount,
    data.contactName, data.vendorName, data.eventName, data.type,
  ]);

  // Measure scroll container height to compute display scale
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setScrollContainerH(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Scale pages to fit visible area (min 0.75 to keep text legible)
  const pageScale = pageHeightPx > 0 && scrollContainerH > 0
    ? Math.max(0.75, Math.min(1, (scrollContainerH - 48) / pageHeightPx))
    : 1;

  // ─── Shared rendering helpers ────────────────────────────────────────────

  const cur = data.currency || "EUR";
  const fmt = (amount: number) => formatCurrency(amount, cur);
  const typeLabel = TYPE_LABELS[data.type] || data.type.toUpperCase();
  const clientName = data.contactName || data.vendorName || "Sin cliente";

  /** Header that repeats on every page */
  const renderPageHeader = (measureAttrs = false) => (
    <div data-ms={measureAttrs ? "page-header" : undefined}>
      {/* Provider + Document type */}
      <div className="flex justify-between items-start pb-4 mb-4 border-b-2 border-gray-900">
        <div className="flex items-start gap-3">
          {data.organization?.invoiceLogo && (
            <img src={data.organization.invoiceLogo} alt="Logo" className="h-10 w-auto max-w-[100px] object-contain" />
          )}
          <div>
            <div className="text-xl font-bold mb-0.5">
              {data.organization?.name || organizationName || "Tu empresa"}
            </div>
            <div className="text-gray-500 text-xs space-y-0.5">
              {data.organization?.taxId && <div>{data.organization.taxId}</div>}
              {data.organization?.fiscalAddress && <div>{data.organization.fiscalAddress}</div>}
              {(data.organization?.fiscalPostalCode || data.organization?.fiscalCity) && (
                <div>{[data.organization.fiscalPostalCode, data.organization.fiscalCity, data.organization.fiscalCountry].filter(Boolean).join(", ")}</div>
              )}
              {(data.organization?.fiscalEmail || data.organization?.fiscalPhone) && (
                <div>{[data.organization.fiscalEmail, data.organization.fiscalPhone].filter(Boolean).join(" • ")}</div>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900">{typeLabel}</div>
          {data.documentNumber && <div className="text-gray-500 font-medium text-sm">{data.documentNumber}</div>}
          {data.documentId && <div className="text-gray-400 text-xs">#{data.documentId}</div>}
          <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
            {STATUS_LABELS[data.status || "draft"] || data.status}
          </span>
        </div>
      </div>

      {/* Client + Dates in one row */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Cliente</div>
          <div className="font-semibold text-sm">{clientName}</div>
          {(data.contactEmail || data.contactPhone || data.contactAddress || data.contactTaxId) && (
            <div className="text-gray-500 text-xs mt-0.5 space-y-0.5">
              {data.contactEmail && <div>{data.contactEmail}</div>}
              {data.contactPhone && <div>{data.contactPhone}</div>}
              {data.contactAddress && <div>{data.contactAddress}</div>}
              {data.contactTaxId && <div>ID: {data.contactTaxId}</div>}
            </div>
          )}
        </div>
        <div className="text-right text-xs text-gray-600 space-y-1">
          {data.eventName && (
            <div>
              <span className="text-gray-400 uppercase tracking-wider text-[10px] block">Evento</span>
              <span className="font-semibold">{data.eventName}</span>
            </div>
          )}
          <div>
            <span className="text-gray-400 uppercase tracking-wider text-[10px] block">Emisión</span>
            {data.issueDate ? formatDate(data.issueDate) : format(new Date(), "dd/MM/yyyy", { locale: es })}
          </div>
          {data.type === "quote" && data.validUntil && (
            <div>
              <span className="text-gray-400 uppercase tracking-wider text-[10px] block">Válido hasta</span>
              {formatDate(data.validUntil)}
            </div>
          )}
          {data.type !== "quote" && data.dueDate && (
            <div>
              <span className="text-gray-400 uppercase tracking-wider text-[10px] block">Vencimiento</span>
              {formatDate(data.dueDate)}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /** Items table header row */
  const renderThead = (measureAttrs = false) => (
    <thead data-ms={measureAttrs ? "thead" : undefined}>
      <tr className="bg-gray-50">
        <th className="text-left p-2.5 text-xs uppercase tracking-wider text-gray-500 border-b-2 border-gray-200">Descripción</th>
        <th className="text-center p-2.5 text-xs uppercase tracking-wider text-gray-500 border-b-2 border-gray-200">Cant.</th>
        <th className="text-right p-2.5 text-xs uppercase tracking-wider text-gray-500 border-b-2 border-gray-200">Precio</th>
        <th className="text-center p-2.5 text-xs uppercase tracking-wider text-gray-500 border-b-2 border-gray-200">Dto.</th>
        <th className="text-center p-2.5 text-xs uppercase tracking-wider text-gray-500 border-b-2 border-gray-200">IVA</th>
        <th className="text-right p-2.5 text-xs uppercase tracking-wider text-gray-500 border-b-2 border-gray-200">Total</th>
      </tr>
    </thead>
  );

  /** Render item rows for a slice of validItems */
  const renderItemRows = (items: typeof validItems, measureAttrs = false, startIdx = 0) =>
    items.map((item, i) => (
      <tr
        key={measureAttrs ? i : startIdx + i}
        data-mi={measureAttrs ? startIdx + i : undefined}
        className="border-b border-gray-100"
      >
        <td className="p-2.5">
          <div>{item.description}</div>
          {item.details && <div className="text-gray-400 text-[11px] mt-0.5 whitespace-pre-wrap">{item.details}</div>}
        </td>
        <td className="p-2.5 text-center">{item.quantity}</td>
        <td className="p-2.5 text-right">{fmt(item.displayUnitPrice)}</td>
        <td className="p-2.5 text-center">{item.discount}%</td>
        <td className="p-2.5 text-center">{item.taxRate}%</td>
        <td className="p-2.5 text-right font-medium">{fmt(item.displayTotal)}</td>
      </tr>
    ));

  /** Totals + optional payment/notes/terms block */
  const renderTail = (measureAttrs = false) => (
    <>
      <div data-ms={measureAttrs ? "totals" : undefined} className="flex justify-end mt-4 mb-4">
        <div className="w-60">
          <div className="flex justify-between py-1.5 border-b border-gray-200">
            <span className="text-gray-500 text-xs">Subtotal</span>
            <span className="text-xs">{fmt(totals.subtotal)}</span>
          </div>
          {totals.globalDiscountAmount > 0 && (
            <div className="flex justify-between py-1.5 border-b border-gray-200 text-green-600 text-xs">
              <span>Descuento{data.globalDiscountType === "percentage" && ` (${data.globalDiscount}%)`}</span>
              <span>-{fmt(totals.globalDiscountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between py-1.5 border-b border-gray-200">
            <span className="text-gray-500 text-xs">IVA</span>
            <span className="text-xs">{fmt(totals.taxAmount)}</span>
          </div>
          <div className="flex justify-between py-2 mt-1.5 border-t-2 border-gray-900 font-bold text-base">
            <span>Total</span>
            <span>{fmt(totals.total)}</span>
          </div>
        </div>
      </div>

      {data.paymentMethod && (
        <div data-ms={measureAttrs ? "payment" : undefined} className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Método de pago</div>
          <div className="text-gray-600 text-xs">
            {{ bank_transfer: "Transferencia bancaria", cash: "Efectivo", card: "Tarjeta", stripe: "Stripe", check: "Cheque", other: "Otro" }[data.paymentMethod] || data.paymentMethod}
          </div>
        </div>
      )}
      {data.notes && (
        <div data-ms={measureAttrs ? "notes" : undefined} className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Notas</div>
          <div className="text-gray-600 whitespace-pre-wrap text-xs">{data.notes}</div>
        </div>
      )}
      {data.termsAndConditions && (
        <div data-ms={measureAttrs ? "terms" : undefined} className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Términos y Condiciones</div>
          <div className="text-gray-600 whitespace-pre-wrap text-xs">{data.termsAndConditions}</div>
        </div>
      )}
    </>
  );

  // ─── Bare mode: content + dashed page-break indicators ───────────────────
  if (bare) {
    return (
      <div ref={measureRef} style={{ position: "relative" }}>
        <div className="p-8" style={{ fontSize: "12px", lineHeight: "1.5" }}>
          {renderPageHeader()}
          <table className="w-full mb-4">{renderThead()}
            <tbody>
              {validItems.length > 0
                ? renderItemRows(validItems)
                : <tr><td colSpan={6} className="p-8 text-center text-gray-400">Añade líneas para ver el preview</td></tr>}
            </tbody>
          </table>
          {renderTail()}
        </div>

        {pageHeightPx > 0 && pages.length > 1 &&
          Array.from({ length: pages.length - 1 }, (_, i) => (
            <div key={i} aria-hidden style={{ position: "absolute", top: (i + 1) * pageHeightPx, left: 0, right: 0, zIndex: 10, pointerEvents: "none" }}>
              <div style={{ borderTop: "1.5px dashed #93c5fd" }} />
              <span style={{ position: "absolute", right: 8, top: 3, fontSize: 9, color: "#60a5fa", background: "white", padding: "1px 6px", borderRadius: 2 }}>
                pág. {i + 2}
              </span>
            </div>
          ))
        }
      </div>
    );
  }

  // ─── Full preview mode ────────────────────────────────────────────────────

  // Hidden measurement div: renders all content with data-ms / data-mi attributes
  const measureNode = (
    <div
      ref={measureRef}
      aria-hidden="true"
      style={{ position: "fixed", visibility: "hidden", pointerEvents: "none", width: "210mm", top: -99999, left: -99999, zIndex: -1 }}
    >
      <div className="p-8" style={{ fontSize: "12px", lineHeight: "1.5" }}>
        {renderPageHeader(true)}
        <table className="w-full">
          {renderThead(true)}
          <tbody>
            {validItems.length > 0
              ? renderItemRows(validItems, true)
              : <tr><td colSpan={6} /></tr>}
          </tbody>
        </table>
        {renderTail(true)}
      </div>
    </div>
  );

  // Render each calculated page independently with its own header + content slice
  const renderFullPage = (page: PageLayout) => {
    const pageItems = validItems.slice(page.itemStartIdx, page.itemEndIdx);
    const showEmptyPlaceholder = validItems.length === 0;
    const slotH = pageHeightPx > 0 ? pageHeightPx * pageScale : undefined;

    return (
      // Slot reserves the visual (scaled) height in the flex flow
      <div
        key={page.pageNum}
        style={{ flexShrink: 0, height: slotH, overflow: "hidden" }}
      >
        <div
          className="bg-white shadow-lg rounded-sm"
          style={{
            width: "210mm",
            minHeight: pageHeightPx > 0 ? `${pageHeightPx}px` : "297mm",
            position: "relative",
            transform: pageScale < 1 ? `scale(${pageScale})` : undefined,
            transformOrigin: "top center",
          }}
        >
          <div className="p-8" style={{ fontSize: "12px", lineHeight: "1.5" }}>
            {renderPageHeader()}
            <table className="w-full mb-2">
              {renderThead()}
              <tbody>
                {showEmptyPlaceholder ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400">Añade líneas para ver el preview</td></tr>
                ) : pageItems.length > 0 ? (
                  renderItemRows(pageItems, false, page.itemStartIdx)
                ) : null}
              </tbody>
            </table>
            {page.showTotals && renderTail()}
          </div>
          <div aria-hidden style={{ position: "absolute", bottom: 12, right: 16, fontSize: 9, color: "#9ca3af", pointerEvents: "none" }}>
            {page.pageNum} / {page.totalPages}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {measureNode}
      <div ref={scrollRef} className="h-full overflow-auto bg-gray-100 py-6">
        <div id="document-preview-content" className="flex flex-col items-center gap-5 px-4">
          {pages.length === 0 ? (
            // Before first measurement: single page placeholder
            <div className="bg-white shadow-lg rounded-sm w-full" style={{ maxWidth: "210mm", minHeight: "297mm" }}>
              <div className="p-8" style={{ fontSize: "12px", lineHeight: "1.5" }}>
                {renderPageHeader()}
                <table className="w-full">{renderThead()}
                  <tbody>
                    {validItems.length > 0
                      ? renderItemRows(validItems)
                      : <tr><td colSpan={6} className="p-8 text-center text-gray-400">Añade líneas para ver el preview</td></tr>}
                  </tbody>
                </table>
                {renderTail()}
              </div>
            </div>
          ) : (
            pages.map((page) => renderFullPage(page))
          )}
        </div>
        {pages.length > 1 && (
          <p className="text-center mt-4 pb-4 text-xs text-gray-400">
            {pages.length} páginas · formato A4
          </p>
        )}
      </div>
    </>
  );
}
