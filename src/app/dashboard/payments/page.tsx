"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserSession } from "@/hooks/use-user-session";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiAddLine,
  RiSearchLine,
  RiMoneyDollarCircleLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiTimeLine,
} from "@remixicon/react";
import { usePayments } from "@/hooks/use-payments";
import { useState } from "react";

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  paid: { label: "Pagado", variant: "success" },
  pending: { label: "Pendiente", variant: "warning" },
  overdue: { label: "Vencido", variant: "destructive" },
  partial: { label: "Parcial", variant: "secondary" },
};

export default function PaymentsPage() {
  return <EventScopedGuard><PaymentsPageContent /></EventScopedGuard>;
}

function PaymentsPageContent() {
  const { can } = useUserSession();
  const canCreateFinance = can("finance:create");
  const { payments, stats, loading, createPayment, markAsPaid } = usePayments();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [newPayment, setNewPayment] = useState({
    concept: "",
    amount: "",
    type: "vendor",
    dueDate: "",
    notes: "",
  });

  const handleCreatePayment = async () => {
    if (!newPayment.concept || !newPayment.amount) return;
    
    await createPayment({
      concept: newPayment.concept,
      amount: parseFloat(newPayment.amount),
      type: newPayment.type,
      dueDate: newPayment.dueDate ? new Date(newPayment.dueDate) : undefined,
      notes: newPayment.notes || undefined,
    });
    setNewPayment({
      concept: "",
      amount: "",
      type: "vendor",
      dueDate: "",
      notes: "",
    });
    setIsDialogOpen(false);
  };

  const filteredPayments = (payments || []).filter((payment) => {
    const matchesSearch = (payment.concept || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || payment.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pagos y Facturación</h1>
          <p className="text-[var(--muted-foreground)]">
            Control de pagos a proveedores y cobros a clientes
          </p>
        </div>
        {canCreateFinance && (
          <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
            <RiAddLine className="h-4 w-4" />
            Nuevo Pago
          </Button>
        )}
        <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <SheetContent className="sm:max-w-3xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Nuevo Pago</SheetTitle>
              <SheetDescription>
                Registra un nuevo pago o cobro
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Concepto *</label>
                <Input
                  placeholder="Descripción del pago"
                  value={newPayment.concept}
                  onChange={(e) => setNewPayment({ ...newPayment, concept: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Monto *</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <Select
                    value={newPayment.type}
                    onValueChange={(value) => setNewPayment({ ...newPayment, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">Pago a Proveedor</SelectItem>
                      <SelectItem value="client">Cobro a Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de Vencimiento</label>
                <Input
                  type="date"
                  value={newPayment.dueDate}
                  onChange={(e) => setNewPayment({ ...newPayment, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notas</label>
                <Input
                  placeholder="Notas adicionales"
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                />
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreatePayment} disabled={!newPayment.concept || !newPayment.amount}>
                Crear Pago
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-10 w-10 rounded-lg mb-2" />
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-6 w-24" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 p-2">
                    <RiArrowUpLine className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Total Pagado
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      ${stats.totalPaid.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-yellow-100 p-2">
                    <RiTimeLine className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Pendiente
                    </p>
                    <p className="text-xl font-bold text-yellow-600">
                      ${stats.totalPending.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-red-100 p-2">
                    <RiArrowDownLine className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">Vencido</p>
                    <p className="text-xl font-bold text-red-600">
                      ${stats.totalOverdue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <RiMoneyDollarCircleLine className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Total Transacciones
                    </p>
                    <p className="text-xl font-bold">{stats.count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input 
            placeholder="Buscar pagos..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filterType === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilterType("all")}
          >
            Todos
          </Button>
          <Button 
            variant={filterType === "vendor" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilterType("vendor")}
          >
            Proveedores
          </Button>
          <Button 
            variant={filterType === "client" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilterType("client")}
          >
            Clientes
          </Button>
        </div>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="pb-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                      Concepto
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                      Tipo
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                      Monto
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                      Vencimiento
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                      Estado
                    </th>
                    <th className="pb-3 text-right text-sm font-medium text-[var(--muted-foreground)]">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => {
                    const status = statusConfig[payment.status || "pending"];

                    return (
                      <tr
                        key={payment.id}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="py-4">
                          <p className="font-medium">{payment.concept}</p>
                          {payment.eventName && (
                            <p className="text-sm text-[var(--muted-foreground)]">
                              {payment.eventName}
                            </p>
                          )}
                        </td>
                        <td className="py-4">
                          <Badge
                            variant={payment.type === "client" ? "default" : "outline"}
                          >
                            {payment.type === "client" ? "Cliente" : "Proveedor"}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <p className="font-semibold">
                            ${parseFloat(payment.amount).toLocaleString()}
                          </p>
                        </td>
                        <td className="py-4">
                          <p className="text-sm">
                            {payment.dueDate
                              ? new Date(payment.dueDate).toLocaleDateString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </p>
                        </td>
                        <td className="py-4">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="py-4 text-right">
                          {payment.status !== "paid" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => markAsPaid(payment.id)}
                            >
                              Marcar Pagado
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <RiMoneyDollarCircleLine className="h-16 w-16 mx-auto text-[var(--muted-foreground)] mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay pagos registrados</h3>
              <p className="text-[var(--muted-foreground)] mb-4">
                Registra tu primer pago o cobro
              </p>
              {canCreateFinance && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <RiAddLine className="h-4 w-4 mr-2" />
                  Nuevo Pago
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
