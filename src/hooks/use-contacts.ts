"use client";

import { useState, useEffect, useCallback } from "react";
import type { Contact, ContactStats, UseContactsParams } from "@/types";

export function useContacts(params: UseContactsParams = {}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats>({
    total: 0,
    persons: 0,
    companies: 0,
    vendors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const entries: [string, string][] = [
        params.search != null ? ["search", params.search] : null,
        params.type != null ? ["type", params.type] : null,
        params.isLead !== undefined ? ["isLead", params.isLead.toString()] : null,
        params.isVendor !== undefined ? ["isVendor", params.isVendor.toString()] : null,
        params.city != null ? ["city", params.city] : null,
        params.tag != null ? ["tag", params.tag] : null,
        params.page != null ? ["page", params.page.toString()] : null,
        params.limit != null ? ["limit", params.limit.toString()] : null,
      ].filter(Boolean) as [string, string][];
      const qs = new URLSearchParams(entries);
      const url = qs.size ? `/api/contacts?${qs}` : "/api/contacts";
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setContacts(result.data?.data || []);
        setStats(result.data?.stats || { total: 0, persons: 0, companies: 0, vendors: 0 });
        setMeta(result.data?.meta || { page: 1, limit: 50, total: 0, totalPages: 0 });
      } else {
        setError(result.error?.message || "Failed to fetch contacts");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  }, [params.search, params.type, params.isLead, params.isVendor, params.city, params.tag, params.page, params.limit]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const createContact = useCallback(async (data: {
    type: "person" | "company";
    name: string;
    email?: string;
    phone?: string;
    [key: string]: unknown;
  }) => {
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        fetchContacts();
        return { success: true, data: result.data };
      }

      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: { message: err instanceof Error ? err.message : "Failed to create contact" } };
    }
  }, [fetchContacts]);

  const deleteContact = useCallback(async (contactId: number) => {
    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        fetchContacts();
        return true;
      }

      return false;
    } catch (err) {
      throw err;
    }
  }, [fetchContacts]);

  return {
    contacts,
    stats,
    loading,
    error,
    meta,
    refetch: fetchContacts,
    createContact,
    deleteContact,
  };
}
