"use client";

import { useState, useEffect, useCallback } from "react";

interface Payment {
  id: number;
  concept: string;
  amount: string;
  currency: string;
  status: string | null;
  type: string | null;
  dueDate: Date | null;
  paidDate: Date | null;
  eventId: number | null;
  vendorId: number | null;
  notes: string | null;
  createdAt: Date | null;
  eventName?: string | null;
  vendorName?: string | null;
}

interface PaymentStats {
  total: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  count: number;
}

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    total: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/finance/payments");
      const result = await response.json();

      if (result.success) {
        const paymentList = result.data || [];
        setPayments(paymentList);

        // Calculate stats
        const totalPaid = paymentList
          .filter((p: Payment) => p.status === "paid")
          .reduce((sum: number, p: Payment) => sum + parseFloat(p.amount || "0"), 0);
        
        const totalPending = paymentList
          .filter((p: Payment) => p.status === "pending")
          .reduce((sum: number, p: Payment) => sum + parseFloat(p.amount || "0"), 0);
        
        const totalOverdue = paymentList
          .filter((p: Payment) => p.status === "overdue")
          .reduce((sum: number, p: Payment) => sum + parseFloat(p.amount || "0"), 0);

        setStats({
          total: totalPaid + totalPending + totalOverdue,
          totalPaid,
          totalPending,
          totalOverdue,
          count: paymentList.length,
        });
      } else {
        setError(result.error?.message ?? "Failed to fetch payments");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const createPayment = useCallback(async (data: {
    concept: string;
    amount: number;
    currency?: string;
    type?: string;
    dueDate?: Date;
    eventId?: number;
    vendorId?: number;
    notes?: string;
  }) => {
    try {
      const response = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        fetchPayments();
        return result.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to create payment:", err);
      return null;
    }
  }, [fetchPayments]);

  const updatePayment = useCallback(async (paymentId: number, data: Partial<Payment>) => {
    try {
      const response = await fetch(`/api/finance/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        fetchPayments();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to update payment:", err);
      return false;
    }
  }, [fetchPayments]);

  const markAsPaid = useCallback(async (paymentId: number) => {
    return updatePayment(paymentId, { status: "paid", paidDate: new Date() } as any);
  }, [updatePayment]);

  return {
    payments,
    stats,
    loading,
    error,
    refetch: fetchPayments,
    createPayment,
    updatePayment,
    markAsPaid,
  };
}
