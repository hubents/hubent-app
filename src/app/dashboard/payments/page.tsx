import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RiAddLine,
  RiSearchLine,
  RiMoneyDollarCircleLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiTimeLine,
} from "@remixicon/react";

const payments = [
  {
    id: "1",
    vendor: "Catering Deluxe",
    event: "Boda García-López",
    amount: 8500,
    status: "paid",
    dueDate: "2025-01-15",
    paidDate: "2025-01-10",
    type: "vendor",
  },
  {
    id: "2",
    vendor: "Foto & Video Pro",
    event: "Boda García-López",
    amount: 3200,
    status: "pending",
    dueDate: "2025-02-01",
    paidDate: null,
    type: "vendor",
  },
  {
    id: "3",
    vendor: "Flores del Valle",
    event: "Boda Martínez-Ruiz",
    amount: 1800,
    status: "pending",
    dueDate: "2025-02-15",
    paidDate: null,
    type: "vendor",
  },
  {
    id: "4",
    vendor: "DJ Sounds",
    event: "Boda Fernández-Torres",
    amount: 1200,
    status: "overdue",
    dueDate: "2025-01-05",
    paidDate: null,
    type: "vendor",
  },
  {
    id: "5",
    vendor: "María García",
    event: "Boda García-López",
    amount: 12500,
    status: "paid",
    dueDate: "2025-01-01",
    paidDate: "2024-12-28",
    type: "client",
  },
  {
    id: "6",
    vendor: "Ana Martínez",
    event: "Boda Martínez-Ruiz",
    amount: 17500,
    status: "partial",
    dueDate: "2025-01-20",
    paidDate: null,
    type: "client",
    partialAmount: 8750,
  },
  {
    id: "7",
    vendor: "Dulces Momentos",
    event: "Boda García-López",
    amount: 950,
    status: "pending",
    dueDate: "2025-02-28",
    paidDate: null,
    type: "vendor",
  },
  {
    id: "8",
    vendor: "Elegance Decor",
    event: "Boda Sánchez-Moreno",
    amount: 2800,
    status: "paid",
    dueDate: "2025-01-10",
    paidDate: "2025-01-08",
    type: "vendor",
  },
];

const statusConfig = {
  paid: { label: "Pagado", variant: "success" as const },
  pending: { label: "Pendiente", variant: "warning" as const },
  overdue: { label: "Vencido", variant: "destructive" as const },
  partial: { label: "Parcial", variant: "secondary" as const },
};

export default function PaymentsPage() {
  const totalPending = payments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalOverdue = payments
    .filter((p) => p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);

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
        <Button className="gap-2">
          <RiAddLine className="h-4 w-4" />
          Nuevo Pago
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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
                  ${totalPaid.toLocaleString()}
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
                  ${totalPending.toLocaleString()}
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
                  ${totalOverdue.toLocaleString()}
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
                <p className="text-xl font-bold">{payments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input placeholder="Buscar pagos..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Todos
          </Button>
          <Button variant="outline" size="sm">
            Proveedores
          </Button>
          <Button variant="outline" size="sm">
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                    Concepto
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                    Evento
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
                {payments.map((payment) => {
                  const status =
                    statusConfig[payment.status as keyof typeof statusConfig];

                  return (
                    <tr
                      key={payment.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="py-4">
                        <p className="font-medium">{payment.vendor}</p>
                      </td>
                      <td className="py-4">
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {payment.event}
                        </p>
                      </td>
                      <td className="py-4">
                        <Badge
                          variant={
                            payment.type === "client" ? "default" : "outline"
                          }
                        >
                          {payment.type === "client" ? "Cliente" : "Proveedor"}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <p className="font-semibold">
                          ${payment.amount.toLocaleString()}
                        </p>
                      </td>
                      <td className="py-4">
                        <p className="text-sm">
                          {new Date(payment.dueDate).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </td>
                      <td className="py-4">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="py-4 text-right">
                        {payment.status !== "paid" && (
                          <Button variant="outline" size="sm">
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
        </CardContent>
      </Card>
    </div>
  );
}
