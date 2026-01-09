"use client";

import { useState, useCallback } from "react";

interface ContactDetail {
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
  passportId: string | null;
  nieOrCif: string | null;
  tradeName: string | null;
  taxId: string | null;
  website: string | null;
  contactPersonName: string | null;
  contactPersonEmail: string | null;
  eventDate: string | null;
  guestCount: number | null;
  budget: string | null;
  venueType: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIban: string | null;
  bankSwift: string | null;
  paymentMethods: string[] | null;
  tags: string[] | null;
  source: string | null;
  leadId: number | null;
  isLead: boolean | null;
  leadScore: number | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ContactDocument {
  id: number;
  contactId: number;
  name: string;
  url: string;
  type: string | null;
  size: number | null;
  mimeType: string | null;
  uploadedBy: string | null;
  uploadedAt: string | null;
}

interface ContactPhoto {
  id: number;
  contactId: number;
  url: string;
  thumbnail: string | null;
  caption: string | null;
  sortOrder: number | null;
  uploadedBy: string | null;
  uploadedAt: string | null;
}

interface ContactActivity {
  id: number;
  type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  createdByName: string | null;
}

interface LinkedEvent {
  id: number;
  eventId: number;
  role: string | null;
  eventName: string;
  eventDate: string | null;
  eventStatus: string | null;
}

interface LinkedTask {
  id: number;
  taskId: number;
  role: string | null;
  taskTitle: string;
  taskStatus: string | null;
  taskDueDate: string | null;
}

export function useContactDetail(contactId: number | null) {
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [documents, setDocuments] = useState<ContactDocument[]>([]);
  const [photos, setPhotos] = useState<ContactPhoto[]>([]);
  const [activities, setActivities] = useState<ContactActivity[]>([]);
  const [linkedEvents, setLinkedEvents] = useState<LinkedEvent[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContact = useCallback(async () => {
    if (!contactId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/contacts/${contactId}`);
      const result = await response.json();

      if (result.success) {
        setContact(result.data);
        setDocuments(result.data.documents || []);
        setPhotos(result.data.photos || []);
        setActivities(result.data.activities || []);
        setLinkedEvents(result.data.linkedEvents || []);
        setLinkedTasks(result.data.linkedTasks || []);
      } else {
        setError(result.error?.message || "Failed to fetch contact");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch contact");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  const updateContact = useCallback(async (updates: Record<string, unknown>) => {
    if (!contactId) return null;

    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (result.success) {
        setContact(prev => prev ? { ...prev, ...result.data } : result.data);
        return result.data;
      }

      return null;
    } catch (err) {
      console.error("Failed to update contact:", err);
      return null;
    }
  }, [contactId]);

  const addDocument = useCallback(async (data: {
    name: string;
    url: string;
    type?: string;
    size?: number;
    mimeType?: string;
  }) => {
    if (!contactId) return null;

    try {
      const response = await fetch(`/api/contacts/${contactId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setDocuments(prev => [result.data, ...prev]);
        return result.data;
      }

      return null;
    } catch (err) {
      console.error("Failed to add document:", err);
      return null;
    }
  }, [contactId]);

  const deleteDocument = useCallback(async (documentId: number) => {
    if (!contactId) return false;

    try {
      const response = await fetch(`/api/contacts/${contactId}/documents?documentId=${documentId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        setDocuments(prev => prev.filter(d => d.id !== documentId));
        return true;
      }

      return false;
    } catch (err) {
      console.error("Failed to delete document:", err);
      return false;
    }
  }, [contactId]);

  const addPhoto = useCallback(async (data: {
    url: string;
    thumbnail?: string;
    caption?: string;
  }) => {
    if (!contactId) return null;

    try {
      const response = await fetch(`/api/contacts/${contactId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setPhotos(prev => [...prev, result.data]);
        return result.data;
      }

      return null;
    } catch (err) {
      console.error("Failed to add photo:", err);
      return null;
    }
  }, [contactId]);

  const deletePhoto = useCallback(async (photoId: number) => {
    if (!contactId) return false;

    try {
      const response = await fetch(`/api/contacts/${contactId}/photos?photoId=${photoId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
        return true;
      }

      return false;
    } catch (err) {
      console.error("Failed to delete photo:", err);
      return false;
    }
  }, [contactId]);

  const addActivity = useCallback(async (data: {
    type: string;
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }) => {
    if (!contactId) return null;

    try {
      const response = await fetch(`/api/contacts/${contactId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setActivities(prev => [result.data, ...prev]);
        return result.data;
      }

      return null;
    } catch (err) {
      console.error("Failed to add activity:", err);
      return null;
    }
  }, [contactId]);

  return {
    contact,
    documents,
    photos,
    activities,
    linkedEvents,
    linkedTasks,
    loading,
    error,
    refetch: fetchContact,
    updateContact,
    addDocument,
    deleteDocument,
    addPhoto,
    deletePhoto,
    addActivity,
  };
}
