"use client";

import { useState } from "react";
import { PCard, Btn, Inp } from "@/components/ui/ds";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiDownloadLine,
  RiFileExcel2Line,
  RiFileTextLine,
  RiCalendarLine,
} from "@remixicon/react";
import { toast } from "sonner";

export default function FinanceReportsPage() {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("invoices");
  
  // Default to current quarter
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
  const quarterEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
  
  const [startDate, setStartDate] = useState(quarterStart.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(quarterEnd.toISOString().split("T")[0]);

  const handleExport = async (format: "csv" | "json") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        startDate,
        endDate,
        format,
      });

      const res = await fetch(`/api/finance/export?${params}`);
      
      if (!res.ok) {
        throw new Error("Error al exportar");
      }

      if (format === "json") {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}_${startDate}_${endDate}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}_${startDate}_${endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success("Exportación completada");
    } catch (error) {
      toast.error("Error al exportar los datos");
    } finally {
      setLoading(false);
    }
  };

  const setQuickPeriod = (period: string) => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "lastMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "thisQuarter":
        const q = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), q * 3, 1);
        end = new Date(today.getFullYear(), (q + 1) * 3, 0);
        break;
      case "lastQuarter":
        const lq = Math.floor(today.getMonth() / 3) - 1;
        const year = lq < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const quarter = lq < 0 ? 3 : lq;
        start = new Date(year, quarter * 3, 1);
        end = new Date(year, (quarter + 1) * 3, 0);
        break;
      case "thisYear":
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      case "lastYear":
        start = new Date(today.getFullYear() - 1, 0, 1);
        end = new Date(today.getFullYear() - 1, 11, 31);
        break;
      default:
        return;
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Export Configuration */}
        <PCard>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }} className="flex items-center gap-2">
              <RiFileExcel2Line className="h-5 w-5" />
              Configurar Exportación
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>Selecciona el tipo de reporte y el período</div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Reporte</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoices">Libro de Facturas Emitidas</SelectItem>
                  <SelectItem value="expenses">Libro de Facturas Recibidas</SelectItem>
                  <SelectItem value="vat">Resumen IVA (Modelo 303)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Inp
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Inp
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Período Rápido</Label>
              <div className="flex flex-wrap gap-2">
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("thisMonth")}
                >
                  Este Mes
                </Btn>
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("lastMonth")}
                >
                  Mes Anterior
                </Btn>
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("thisQuarter")}
                >
                  Este Trimestre
                </Btn>
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("lastQuarter")}
                >
                  Trimestre Anterior
                </Btn>
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("thisYear")}
                >
                  Este Año
                </Btn>
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("lastYear")}
                >
                  Año Anterior
                </Btn>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Btn
                onClick={() => handleExport("csv")}
                disabled={loading}
                style={{ flex: 1 }}
              >
                <RiDownloadLine className="mr-2 h-4 w-4" />
                Exportar CSV
              </Btn>
              <Btn
                variant="outline"
                onClick={() => handleExport("json")}
                disabled={loading}
              >
                JSON
              </Btn>
            </div>
          </div>
        </PCard>

        {/* Report Descriptions */}
        <div className="space-y-4">
          <PCard>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }} className="flex items-center gap-2">
                <RiFileTextLine className="h-4 w-4" />
                Libro de Facturas Emitidas
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Listado de todas las facturas emitidas a clientes. Incluye número,
              fecha, cliente, NIF, base imponible, IVA y total. Útil para el
              registro de ventas y declaraciones trimestrales.
            </p>
          </PCard>

          <PCard>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }} className="flex items-center gap-2">
                <RiFileTextLine className="h-4 w-4" />
                Libro de Facturas Recibidas
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Listado de facturas de proveedores. Incluye los mismos campos que
              el libro de emitidas. Necesario para justificar el IVA deducible.
            </p>
          </PCard>

          <PCard>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }} className="flex items-center gap-2">
                <RiCalendarLine className="h-4 w-4" />
                Resumen IVA (Modelo 303)
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Resumen trimestral de IVA repercutido (ventas) e IVA soportado
              (compras), con desglose por tipo impositivo. Calcula automáticamente
              la cuota diferencial a ingresar o compensar.
            </p>
          </PCard>
        </div>
      </div>
    </div>
  );
}
