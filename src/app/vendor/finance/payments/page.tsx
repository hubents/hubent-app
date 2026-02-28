"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiMoneyDollarCircleLine,
  RiArrowLeftLine,
} from "@remixicon/react";
import Link from "next/link";
import { toast } from "sonner";

interface Payment {
  id: number;
  amount: string;
  currency: string;
  paymentMethod: string | null;
  reference: string | null;
  paymentDate: string | null;
  documentNumber: string | null;
  contactName: string | null;
}

export default function VendorPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayments() {
      try {
        const res = await fetch("/api/finance/payments?limit=50");
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
  }, []);

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
            <div className="divide-y">
              {payments.map((p) => {
                const formattedAmount = new Intl.NumberFormat("es-ES", {
                  style: "currency",
                  currency: p.currency || "EUR",
                }).format(parseFloat(p.amount || "0"));
                const methodLabels: Record<string, string> = {
                  cash: "Efectivo",
                  bank_transfer: "Transferencia",
                  card: "Tarjeta",
                  stripe: "Stripe",
                  other: "Otro",
                };
                return (
                  <div key={p.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <RiMoneyDollarCircleLine className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{p.documentNumber || `Pago #${p.id}`}</p>
                        <p className="text-xs text-muted-foreground">{p.contactName || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-semibold text-sm text-green-600">
                        +{formattedAmount}
                      </p>
                      {p.paymentMethod && <Badge variant="outline">{methodLabels[p.paymentMethod] || p.paymentMethod}</Badge>}
                      <p className="text-xs text-muted-foreground w-20 text-right">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("es-AR") : "—"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
