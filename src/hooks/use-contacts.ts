"use client";

import { useState, useEffect, useCallback } from "react";

interface Contact {
  id: number;
  organizationId: number;
  type: "person" | "company";
  name: string;
  email: string | null;
  phone: string | null;
  phoneCountryCode: string | null;
  avatar: string | null;
  firstName: string | null;
  lastName: string | null;
  tradeName: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  tags: string[] | null;
  source: string | null;
  isLead: boolean | null;
  leadScore: number | null;
  createdAt: Date | null;
  createdByName: string | null;
}

interface ContactStats {
  total: number;
  persons: number;
  companies: number;
  leads: number;
}

interface UseContactsParams {
  search?: string;
  type?: string;
  isLead?: boolean;
  city?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

export function useContacts(params: UseContactsParams = {}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats>({
    total: 0,
    persons: 0,
    companies: 0,
    leads: 0,
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
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set("search", params.search);
      if (params.type) searchParams.set("type", params.type);
      if (params.isLead !== undefined) searchParams.set("isLead", params.isLead.toString());
      if (params.city) searchParams.set("city", params.city);
      if (params.tag) searchParams.set("tag", params.tag);
      if (params.page) searchParams.set("page", params.page.toString());
      if (params.limit) searchParams.set("limit", params.limit.toString());

      const url = `/api/contacts${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setContacts(result.data || []);
        setStats(result.stats || { total: 0, persons: 0, companies: 0, leads: 0 });
        setMeta(result.meta || { page: 1, limit: 50, total: 0, totalPages: 0 });
      } else {
        setError(result.error?.message || "Failed to fetch contacts");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  }, [params.search, params.type, params.isLead, params.city, params.tag, params.page, params.limit]);

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
      console.error("Failed to delete contact:", err);
      return false;
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
