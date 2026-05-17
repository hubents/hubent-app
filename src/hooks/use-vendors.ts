"use client";

import { useState, useEffect, useCallback } from "react";
import type { Vendor, VendorStats } from "@/types";

export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stats, setStats] = useState<VendorStats>({
    total: 0,
    active: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/vendors");
      const result = await response.json();

      if (result.success) {
        const vendorList = result.data || [];
        setVendors(vendorList);

        // Calculate stats
        const total = vendorList.length;
        const active = vendorList.filter((v: Vendor) => v.status === "active").length;
        const pending = vendorList.filter((v: Vendor) => v.status === "pending").length;

        setStats({ total, active, pending });
      } else {
        setError(result.error?.message ?? "Failed to fetch vendors");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const createVendor = useCallback(async (data: {
    name: string;
    category?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    notes?: string;
  }) => {
    try {
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        fetchVendors();
        return result.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to create vendor:", err);
      return null;
    }
  }, [fetchVendors]);

  const updateVendor = useCallback(async (vendorId: number, data: Partial<Vendor>) => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        fetchVendors();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to update vendor:", err);
      return false;
    }
  }, [fetchVendors]);

  const deleteVendor = useCallback(async (vendorId: number) => {
    try {
      await fetch(`/api/vendors/${vendorId}`, { method: "DELETE" });
      fetchVendors();
    } catch (err) {
      console.error("Failed to delete vendor:", err);
    }
  }, [fetchVendors]);

  return {
    vendors,
    stats,
    loading,
    error,
    refetch: fetchVendors,
    createVendor,
    updateVendor,
    deleteVendor,
  };
}
