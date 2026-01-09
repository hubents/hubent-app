import { useState, useEffect, useCallback } from "react";

interface TaskDetail {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  dueDate: string | null;
  eventId: number | null;
  eventName?: string | null;
  assignedTo: string | null;
  assignedUserName?: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskParticipant {
  id: number;
  taskId: number;
  userId: string | null;
  vendorId: number | null;
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  vendorName?: string | null;
  name?: string | null;
  isVendor?: boolean;
  type: string;
  canEdit: boolean;
  canComment: boolean;
  addedAt: string;
}

interface TaskVideo {
  id: number;
  taskId: number;
  youtubeUrl: string;
  title: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: string;
}

interface TaskAttachment {
  id: number;
  taskId: number;
  messageId: number | null;
  type: string;
  name: string;
  url: string;
  thumbnail: string | null;
  size: number | null;
  mimeType: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
}

interface TaskScheduleItem {
  id: number;
  taskId: number;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskHtmlContent {
  id?: number;
  taskId: number;
  content: string;
  updatedBy?: string | null;
  updatedAt?: string;
}

interface TaskPayment {
  id: number;
  taskId: number;
  description: string;
  amount: string;
  date: string;
  status: string | null;
  createdBy: string | null;
  createdAt: string;
}

export function useTaskDetail(taskId: number | null) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [participants, setParticipants] = useState<TaskParticipant[]>([]);
  const [videos, setVideos] = useState<TaskVideo[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [scheduleItems, setScheduleItems] = useState<TaskScheduleItem[]>([]);
  const [htmlContent, setHtmlContent] = useState<TaskHtmlContent | null>(null);
  const [payments, setPayments] = useState<TaskPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (data.success) {
        setTask(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch task:", err);
    }
  }, [taskId]);

  const fetchParticipants = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/participants`);
      const data = await res.json();
      if (data.success) {
        setParticipants(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch participants:", err);
    }
  }, [taskId]);

  const fetchVideos = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/videos`);
      const data = await res.json();
      if (data.success) {
        setVideos(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    }
  }, [taskId]);

  const fetchAttachments = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`);
      const data = await res.json();
      if (data.success) {
        setAttachments(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch attachments:", err);
    }
  }, [taskId]);

  const fetchScheduleItems = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/schedule`);
      const data = await res.json();
      if (data.success) {
        setScheduleItems(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch schedule items:", err);
    }
  }, [taskId]);

  const fetchHtmlContent = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/html-content`);
      const data = await res.json();
      if (data.success) {
        setHtmlContent(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch HTML content:", err);
    }
  }, [taskId]);

  const fetchPayments = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/payments`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch payments:", err);
    }
  }, [taskId]);

  const fetchAll = useCallback(async () => {
    if (!taskId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchTask(),
        fetchParticipants(),
        fetchVideos(),
        fetchAttachments(),
        fetchScheduleItems(),
        fetchHtmlContent(),
        fetchPayments(),
      ]);
    } catch (err) {
      setError("Failed to load task details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [taskId, fetchTask, fetchParticipants, fetchVideos, fetchAttachments, fetchScheduleItems, fetchHtmlContent, fetchPayments]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Update task
  const updateTask = useCallback(async (updates: Partial<TaskDetail>) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setTask(data.data);
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to update task:", err);
      return null;
    }
  }, [taskId]);

  // Add video
  const addVideo = useCallback(async (videoData: { youtubeUrl: string; title?: string; description?: string }) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(videoData),
      });
      const data = await res.json();
      if (data.success) {
        await fetchVideos();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to add video:", err);
      return null;
    }
  }, [taskId, fetchVideos]);

  // Delete video
  const deleteVideo = useCallback(async (videoId: number) => {
    if (!taskId) return false;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/videos?videoId=${videoId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchVideos();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete video:", err);
      return false;
    }
  }, [taskId, fetchVideos]);

  // Add attachment
  const addAttachment = useCallback(async (attachmentData: { name: string; url: string; type?: string; size?: number; mimeType?: string }) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attachmentData),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAttachments();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to add attachment:", err);
      return null;
    }
  }, [taskId, fetchAttachments]);

  // Delete attachment
  const deleteAttachment = useCallback(async (attachmentId: number) => {
    if (!taskId) return false;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchAttachments();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete attachment:", err);
      return false;
    }
  }, [taskId, fetchAttachments]);

  // Add schedule item
  const addScheduleItem = useCallback(async (itemData: { title: string; date: string; startTime?: string; endTime?: string; description?: string; location?: string }) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      });
      const data = await res.json();
      if (data.success) {
        await fetchScheduleItems();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to add schedule item:", err);
      return null;
    }
  }, [taskId, fetchScheduleItems]);

  // Update schedule item
  const updateScheduleItem = useCallback(async (scheduleItemId: number, updates: Partial<TaskScheduleItem>) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleItemId, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchScheduleItems();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to update schedule item:", err);
      return null;
    }
  }, [taskId, fetchScheduleItems]);

  // Delete schedule item
  const deleteScheduleItem = useCallback(async (scheduleItemId: number) => {
    if (!taskId) return false;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/schedule?scheduleItemId=${scheduleItemId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchScheduleItems();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete schedule item:", err);
      return false;
    }
  }, [taskId, fetchScheduleItems]);

  // Save HTML content
  const saveHtmlContent = useCallback(async (content: string) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/html-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.success) {
        setHtmlContent(data.data);
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to save HTML content:", err);
      return null;
    }
  }, [taskId]);

  // Add participant (user or vendor)
  const addParticipant = useCallback(async (participantData: { userId?: string; vendorId?: number; type: string; canEdit?: boolean; canComment?: boolean }) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(participantData),
      });
      const data = await res.json();
      if (data.success) {
        await fetchParticipants();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to add participant:", err);
      return null;
    }
  }, [taskId, fetchParticipants]);

  // Remove participant
  const removeParticipant = useCallback(async (participantId: number) => {
    if (!taskId) return false;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/participants?participantId=${participantId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchParticipants();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to remove participant:", err);
      return false;
    }
  }, [taskId, fetchParticipants]);

  // Add payment
  const addPayment = useCallback(async (paymentData: { description: string; amount: number; date?: string }) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });
      const data = await res.json();
      if (data.success) {
        await fetchPayments();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to add payment:", err);
      return null;
    }
  }, [taskId, fetchPayments]);

  // Delete payment
  const deletePayment = useCallback(async (paymentId: number) => {
    if (!taskId) return false;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/payments?paymentId=${paymentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchPayments();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete payment:", err);
      return false;
    }
  }, [taskId, fetchPayments]);

  return {
    task,
    participants,
    videos,
    attachments,
    scheduleItems,
    htmlContent,
    payments,
    loading,
    error,
    refetch: fetchAll,
    updateTask,
    addVideo,
    deleteVideo,
    addAttachment,
    deleteAttachment,
    addScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    saveHtmlContent,
    addParticipant,
    removeParticipant,
    addPayment,
    deletePayment,
  };
}
