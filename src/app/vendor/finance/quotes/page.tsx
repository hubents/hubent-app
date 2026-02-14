"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiFileTextLine,
  RiArrowLeftLine,
} from "@remixicon/react";
import Link from "next/link";
import { toast } from "sonner";

interface Quote {
  id: number;
  documentNumber: string;
  clientName: string | null;
  total: string;
  status: string;
  issueDate: string;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Borrador", variant: "outline" },
  sent: { label: "Enviado", variant: "secondary" },
  accepted: { label: "Aceptado", variant: "default" },
  rejected: { label: "Rechazado", variant: "destructive" },
};

export default function VendorQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuotes() {
      try {
        const res = await fetch("/api/finance/documents?type=quote&limit=50");
        const data = await res.json();
        if (data.success) {
          setQuotes(data.data || []);
        }
      } catch {
        toast.error("Error al cargar presupuestos");
      } finally {
        setLoading(false);
      }
    }
    fetchQuotes();
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
          <h1 className="text-2xl font-bold">Presupuestos</h1>
          <p className="text-muted-foreground text-sm">{quotes.length} presupuestos</p>
        </div>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiFileTextLine className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No hay presupuestos todavía</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {quotes.map((q) => {
                const st = statusLabels[q.status] || statusLabels.draft;
                return (
                  <div key={q.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <RiFileTextLine className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{q.documentNumber || `#${q.id}`}</p>
                        <p className="text-xs text-muted-foreground">{q.clientName || "Sin cliente"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-semibold text-sm">{Number(q.total).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
                      <Badge variant={st.variant}>{st.label}</Badge>
                      <p className="text-xs text-muted-foreground w-20 text-right">
                        {q.issueDate ? new Date(q.issueDate).toLocaleDateString("es-AR") : "—"}
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
