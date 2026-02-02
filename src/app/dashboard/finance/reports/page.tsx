"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Reportes y Exportación</h1>
        <p className="text-muted-foreground">
          Exporta datos financieros para contabilidad
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Export Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiFileExcel2Line className="h-5 w-5" />
              Configurar Exportación
            </CardTitle>
            <CardDescription>
              Selecciona el tipo de reporte y el período
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Período Rápido</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("thisMonth")}
                >
                  Este Mes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("lastMonth")}
                >
                  Mes Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("thisQuarter")}
                >
                  Este Trimestre
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("lastQuarter")}
                >
                  Trimestre Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("thisYear")}
                >
                  Este Año
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("lastYear")}
                >
                  Año Anterior
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => handleExport("csv")}
                disabled={loading}
                className="flex-1"
              >
                <RiDownloadLine className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("json")}
                disabled={loading}
              >
                JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Descriptions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <RiFileTextLine className="h-4 w-4" />
                Libro de Facturas Emitidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Listado de todas las facturas emitidas a clientes. Incluye número, 
                fecha, cliente, NIF, base imponible, IVA y total. Útil para el 
                registro de ventas y declaraciones trimestrales.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <RiFileTextLine className="h-4 w-4" />
                Libro de Facturas Recibidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Listado de facturas de proveedores. Incluye los mismos campos que 
                el libro de emitidas. Necesario para justificar el IVA deducible.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <RiCalendarLine className="h-4 w-4" />
                Resumen IVA (Modelo 303)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Resumen trimestral de IVA repercutido (ventas) e IVA soportado 
                (compras), con desglose por tipo impositivo. Calcula automáticamente 
                la cuota diferencial a ingresar o compensar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
