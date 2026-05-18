"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("finance");
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
        throw new Error(t("reports.exportErrorGeneric"));
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

      toast.success(t("reports.exportSuccess"));
    } catch {
      toast.error(t("reports.exportError"));
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
      case "thisQuarter": {
        const q = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), q * 3, 1);
        end = new Date(today.getFullYear(), (q + 1) * 3, 0);
        break;
      }
      case "lastQuarter": {
        const lq = Math.floor(today.getMonth() / 3) - 1;
        const year = lq < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const quarter = lq < 0 ? 3 : lq;
        start = new Date(year, quarter * 3, 1);
        end = new Date(year, (quarter + 1) * 3, 0);
        break;
      }
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
              {t("reports.exportConfigTitle")}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>{t("reports.exportConfigSubtitle")}</div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("reports.reportTypeLabel")}</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoices">{t("reports.reportTypeInvoices")}</SelectItem>
                  <SelectItem value="expenses">{t("reports.reportTypeExpenses")}</SelectItem>
                  <SelectItem value="vat">{t("reports.reportTypeVat")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("reports.startDateLabel")}</Label>
                <Inp
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("reports.endDateLabel")}</Label>
                <Inp
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("reports.quickPeriodLabel")}</Label>
              <div className="flex flex-wrap gap-2">
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("thisMonth")}
                >
                  {t("reports.thisMonth")}
                </Btn>
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("lastMonth")}
                >
                  {t("reports.lastMonth")}
                </Btn>
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("thisQuarter")}
                >
                  {t("reports.thisQuarter")}
                </Btn>
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("lastQuarter")}
                >
                  {t("reports.lastQuarter")}
                </Btn>
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("thisYear")}
                >
                  {t("reports.thisYear")}
                </Btn>
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPeriod("lastYear")}
                >
                  {t("reports.lastYear")}
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
                {t("reports.exportCsv")}
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
                {t("reports.issuedInvoicesTitle")}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("reports.issuedInvoicesDesc")}
            </p>
          </PCard>

          <PCard>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }} className="flex items-center gap-2">
                <RiFileTextLine className="h-4 w-4" />
                {t("reports.receivedInvoicesTitle")}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("reports.receivedInvoicesDesc")}
            </p>
          </PCard>

          <PCard>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }} className="flex items-center gap-2">
                <RiCalendarLine className="h-4 w-4" />
                {t("reports.vatSummaryTitle")}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("reports.vatSummaryDesc")}
            </p>
          </PCard>
        </div>
      </div>
    </div>
  );
}
