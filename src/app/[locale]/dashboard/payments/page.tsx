"use client";

import { useTranslations } from "next-intl";
import { PCard, Pill, Btn, Inp } from "@/components/ui/ds";
import { PageHeader } from "@/components/layout/page-header";
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

const statusConfig: Record<string, { bg: string; color: string }> = {
  paid: { bg: "#D1FAE5", color: "#065F46" },
  pending: { bg: "#FEF3C7", color: "#92400E" },
  overdue: { bg: "#FEE2E2", color: "#991B1B" },
  partial: { bg: "var(--bg-subtle)", color: "var(--ink-2)" },
};

export default function PaymentsPage() {
  return <EventScopedGuard><PaymentsPageContent /></EventScopedGuard>;
}

function PaymentsPageContent() {
  const t = useTranslations("payments");
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
      <PageHeader
        action={canCreateFinance && (
          <Btn onClick={() => setIsDialogOpen(true)}>
            <RiAddLine className="h-4 w-4" />
            {t("newPayment")}
          </Btn>
        )}
      />
        <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <SheetContent className="sm:max-w-3xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{t("newPayment")}</SheetTitle>
              <SheetDescription>
                {t("newPaymentDescription")}
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("concept")}</label>
                <Inp
                  placeholder={t("conceptPlaceholder")}
                  value={newPayment.concept}
                  onChange={(e) => setNewPayment({ ...newPayment, concept: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("amount")}</label>
                  <Inp
                    type="number"
                    placeholder="0.00"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("type")}</label>
                  <Select
                    value={newPayment.type}
                    onValueChange={(value) => setNewPayment({ ...newPayment, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">{t("typeVendor")}</SelectItem>
                      <SelectItem value="client">{t("typeClient")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("dueDate")}</label>
                <Inp
                  type="date"
                  value={newPayment.dueDate}
                  onChange={(e) => setNewPayment({ ...newPayment, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("notes")}</label>
                <Inp
                  placeholder={t("notesPlaceholder")}
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                />
              </div>
            </div>
            <SheetFooter>
              <Btn variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t("cancel")}
              </Btn>
              <Btn onClick={handleCreatePayment} disabled={!newPayment.concept || !newPayment.amount}>
                {t("createPayment")}
              </Btn>
            </SheetFooter>
          </SheetContent>
        </Sheet>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <PCard key={i} padding={16}>
              <Skeleton className="h-10 w-10 rounded-lg mb-2" />
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-6 w-24" />
            </PCard>
          ))
        ) : (
          <>
            <PCard padding={16}>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2">
                  <RiArrowUpLine className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("statTotalPaid")}
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    ${stats.totalPaid.toLocaleString()}
                  </p>
                </div>
              </div>
            </PCard>

            <PCard padding={16}>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-yellow-100 p-2">
                  <RiTimeLine className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("statPending")}
                  </p>
                  <p className="text-xl font-bold text-yellow-600">
                    ${stats.totalPending.toLocaleString()}
                  </p>
                </div>
              </div>
            </PCard>

            <PCard padding={16}>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-2">
                  <RiArrowDownLine className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("statOverdue")}</p>
                  <p className="text-xl font-bold text-red-600">
                    ${stats.totalOverdue.toLocaleString()}
                  </p>
                </div>
              </div>
            </PCard>

            <PCard padding={16}>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <RiMoneyDollarCircleLine className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("statTotalTransactions")}
                  </p>
                  <p className="text-xl font-bold">{stats.count}</p>
                </div>
              </div>
            </PCard>
          </>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Inp
            placeholder={t("searchPlaceholder")}
            style={{ paddingLeft: 36 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Btn
            variant={filterType === "all" ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
          >
            {t("filterAll")}
          </Btn>
          <Btn
            variant={filterType === "vendor" ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilterType("vendor")}
          >
            {t("filterVendors")}
          </Btn>
          <Btn
            variant={filterType === "client" ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilterType("client")}
          >
            {t("filterClients")}
          </Btn>
        </div>
      </div>

      {/* Payments Table */}
      <PCard>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>{t("paymentHistory")}</div>
        </div>
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
                      {t("colConcept")}
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                      {t("colType")}
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                      {t("colAmount")}
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                      {t("colDueDate")}
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                      {t("colStatus")}
                    </th>
                    <th className="pb-3 text-right text-sm font-medium text-[var(--muted-foreground)]">
                      {t("colActions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => {
                    const statusKey = payment.status || "pending";
                    const status = statusConfig[statusKey];

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
                          <Pill
                            bg={payment.type === "client" ? "var(--color-primary)" : "transparent"}
                            color={payment.type === "client" ? "#fff" : "var(--ink-1)"}
                            style={payment.type !== "client" ? { border: "1px solid var(--line-strong)" } : undefined}
                          >
                            {payment.type === "client" ? t("typeClientLabel") : t("typeVendorLabel")}
                          </Pill>
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
                          <Pill bg={status.bg} color={status.color}>{t(`status_${statusKey}`)}</Pill>
                        </td>
                        <td className="py-4 text-right">
                          {payment.status !== "paid" && (
                            <Btn
                              variant="outline"
                              size="sm"
                              onClick={() => markAsPaid(payment.id)}
                            >
                              {t("markPaid")}
                            </Btn>
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
              <h3 className="text-lg font-semibold mb-2">{t("noPayments")}</h3>
              <p className="text-[var(--muted-foreground)] mb-4">
                {t("noPaymentsSubtitle")}
              </p>
              {canCreateFinance && (
                <Btn onClick={() => setIsDialogOpen(true)}>
                  <RiAddLine className="h-4 w-4 mr-2" />
                  {t("newPayment")}
                </Btn>
              )}
            </div>
          )}
      </PCard>
    </div>
  );
}
