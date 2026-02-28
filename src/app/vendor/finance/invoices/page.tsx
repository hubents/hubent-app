"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiFileList2Line,
  RiArrowLeftLine,
} from "@remixicon/react";
import Link from "next/link";
import { toast } from "sonner";

interface Invoice {
  id: number;
  number: string;
  contactName: string | null;
  companyName: string | null;
  vendorName: string | null;
  total: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Borrador", variant: "outline" },
  sent: { label: "Pendiente", variant: "secondary" },
  partial: { label: "Parcial", variant: "secondary" },
  paid: { label: "Pagada", variant: "default" },
  overdue: { label: "Vencida", variant: "destructive" },
};

export default function VendorInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const res = await fetch("/api/finance/documents?type=invoice&limit=50");
        const data = await res.json();
        if (data.success) {
          setInvoices(data.data || []);
        }
      } catch {
        toast.error("Error al cargar facturas");
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/vendor/finance">
            <Button variant="ghost" size="icon">
              <RiArrowLeftLine className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Facturas</h1>
            <p className="text-muted-foreground text-sm">{invoices.length} facturas</p>
          </div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiFileList2Line className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No hay facturas todavía</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {invoices.map((inv) => {
                const st = statusLabels[inv.status] || statusLabels.draft;
                return (
                  <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <RiFileList2Line className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{inv.number || `#${inv.id}`}</p>
                        <p className="text-xs text-muted-foreground">{inv.contactName || inv.companyName || inv.vendorName || "Sin cliente"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-semibold text-sm">{new Intl.NumberFormat("es-ES", { style: "currency", currency: inv.currency || "EUR" }).format(Number(inv.total || 0))}</p>
                      <Badge variant={st.variant}>{st.label}</Badge>
                      <p className="text-xs text-muted-foreground w-20 text-right">
                        {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString("es-AR") : "—"}
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
