"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RiMoneyDollarCircleLine,
  RiArrowLeftLine,
  RiFileDownloadLine,
} from "@remixicon/react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Payment {
  id: number;
  amount: string;
  currency: string;
  direction: string | null;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  status: string | null;
  paymentDate: string | null;
  documentNumber: string | null;
  documentType: string | null;
  contactName: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
}

const methodLabels: Record<string, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  card: "Tarjeta",
  stripe: "Stripe",
  other: "Otro",
};

type DirectionTab = "all" | "incoming" | "outgoing";
const directionTabs: { key: DirectionTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "incoming", label: "Cobros" },
  { key: "outgoing", label: "Pagos" },
];

export default function VendorPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState<DirectionTab>("all");

  useEffect(() => {
    async function fetchPayments() {
      try {
        const params = new URLSearchParams({ limit: "100" });
        if (directionFilter !== "all") params.set("direction", directionFilter);
        const res = await fetch(`/api/finance/payments?${params}`);
        const data = await res.json();
        if (data.success) {
          setPayments(data.data || []);
        }
      } catch {
        toast.error("Error al cargar pagos");
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, [directionFilter]);

  const formatCurrency = (amount: string, cur = "EUR") =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(parseFloat(amount || "0"));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vendor/finance">
          <Button variant="ghost" size="icon">
            <RiArrowLeftLine className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <p className="text-muted-foreground text-sm">{payments.length} pagos registrados</p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {directionTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setDirectionFilter(tab.key)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              directionFilter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiMoneyDollarCircleLine className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No hay pagos registrados</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Comprobante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">
                      {p.paymentDate
                        ? format(new Date(p.paymentDate), "dd MMM yyyy", { locale: es })
                        : "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {p.documentNumber || p.reference || `#${p.id}`}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.direction === "incoming"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {p.direction === "incoming" ? "Cobro" : "Pago"}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {methodLabels[p.paymentMethod || ""] || p.paymentMethod || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={p.status === "complete" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                        {p.status === "complete" ? "Completo" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={p.direction === "incoming" ? "text-emerald-600" : "text-red-600"}>
                        {p.direction === "incoming" ? "+" : "-"}
                        {formatCurrency(p.amount, p.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.attachmentUrl ? (
                        <a href={p.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                          <RiFileDownloadLine className="h-3.5 w-3.5" />
                          {p.attachmentName || "Ver"}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
