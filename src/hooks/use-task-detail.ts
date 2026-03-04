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
  vendorId: number | null;
  paymentMethod: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  vendorName: string | null;
  vendorCategory: string | null;
  vendorEmail: string | null;
  vendorPhone: string | null;
  vendorAddress: string | null;
}

interface UnifiedPayment {
  id: number;
  documentId: number | null;
  taskId: number | null;
  vendorId: number | null;
  contactId: number | null;
  eventId: number | null;
  amount: string;
  currency: string;
  direction: string;
  paymentDate: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  status: string | null;
  documentNumber?: string | null;
  documentType?: string | null;
  contactName?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  source: "unified";
}

interface TaskMeeting {
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

interface ChecklistAssignee {
  id: number;
  participantId: number;
  type: string | null;
  name: string;
  isUser: boolean;
  isVendor: boolean;
  isContact: boolean;
  assignedAt: string | null;
}

interface TaskChecklistItem {
  id: number;
  taskId: number;
  title: string;
  isCompleted: boolean;
  dueDate: string | null;
  sortOrder: number;
  completedAt: string | null;
  completedBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  assignees: ChecklistAssignee[];
}

export function useTaskDetail(taskId: number | null) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [participants, setParticipants] = useState<TaskParticipant[]>([]);
  const [videos, setVideos] = useState<TaskVideo[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [scheduleItems, setScheduleItems] = useState<TaskScheduleItem[]>([]);
  const [htmlContent, setHtmlContent] = useState<TaskHtmlContent | null>(null);
  const [payments, setPayments] = useState<TaskPayment[]>([]);
  const [unifiedPayments, setUnifiedPayments] = useState<UnifiedPayment[]>([]);
  const [meetings, setMeetings] = useState<TaskMeeting[]>([]);
  const [checklistItems, setChecklistItems] = useState<TaskChecklistItem[]>([]);
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
      if (data.success && Array.isArray(data.data)) {
        setParticipants(data.data);
      } else {
        setParticipants([]);
      }
    } catch (err) {
      console.error("Failed to fetch participants:", err);
      setParticipants([]);
    }
  }, [taskId]);

  const fetchVideos = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/videos`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setVideos(data.data);
      } else {
        setVideos([]);
      }
    } catch (err) {
      console.error("Failed to fetch videos:", err);
      setVideos([]);
    }
  }, [taskId]);

  const fetchAttachments = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAttachments(data.data);
      } else {
        setAttachments([]);
      }
    } catch (err) {
      console.error("Failed to fetch attachments:", err);
      setAttachments([]);
    }
  }, [taskId]);

  const fetchScheduleItems = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/schedule`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setScheduleItems(data.data);
      } else {
        setScheduleItems([]);
      }
    } catch (err) {
      console.error("Failed to fetch schedule items:", err);
      setScheduleItems([]);
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
      const [legacyRes, unifiedRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}/payments`),
        fetch(`/api/finance/payments?taskId=${taskId}&limit=100`),
      ]);
      const legacyData = await legacyRes.json();
      if (legacyData.success && Array.isArray(legacyData.data)) {
        setPayments(legacyData.data);
      } else {
        setPayments([]);
      }
      const unifiedData = await unifiedRes.json();
      if (unifiedData.success && Array.isArray(unifiedData.data)) {
        setUnifiedPayments(unifiedData.data.map((p: UnifiedPayment) => ({ ...p, source: "unified" as const })));
      } else {
        setUnifiedPayments([]);
      }
    } catch (err) {
      console.error("Failed to fetch payments:", err);
      setPayments([]);
      setUnifiedPayments([]);
    }
  }, [taskId]);

  const fetchMeetings = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/meetings`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMeetings(data.data);
      } else {
        setMeetings([]);
      }
    } catch (err) {
      console.error("Failed to fetch meetings:", err);
      setMeetings([]);
    }
  }, [taskId]);

  const fetchChecklist = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setChecklistItems(data.data);
      } else {
        setChecklistItems([]);
      }
    } catch (err) {
      console.error("Failed to fetch checklist:", err);
      setChecklistItems([]);
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
        fetchMeetings(),
        fetchChecklist(),
      ]);
    } catch (err) {
      setError("Failed to load task details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [taskId, fetchTask, fetchParticipants, fetchVideos, fetchAttachments, fetchScheduleItems, fetchHtmlContent, fetchPayments, fetchMeetings, fetchChecklist]);

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
  const addParticipant = useCallback(async (participantData: { userId?: string; vendorId?: number; contactId?: number; type: string; canEdit?: boolean; canComment?: boolean }) => {
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

  // Add payment (unified system)
  const addPayment = useCallback(async (paymentData: { 
    description?: string; 
    amount: number; 
    date?: string;
    vendorId?: number;
    contactId?: number;
    paymentMethod?: string;
    notes?: string;
    direction?: string;
    status?: string;
    documentId?: number;
    attachmentUrl?: string;
    attachmentName?: string;
  }) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentData,
          taskId,
          eventId: task?.eventId || undefined,
          paymentDate: paymentData.date ? new Date(paymentData.date) : new Date(),
        }),
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
  }, [taskId, task?.eventId, fetchPayments]);

  // Update payment (unified system)
  const updatePayment = useCallback(async (paymentId: number, paymentData: {
    amount?: number;
    paymentMethod?: string;
    paymentDate?: Date;
    reference?: string;
    notes?: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }) => {
    try {
      const res = await fetch(`/api/finance/payments/${paymentId}`, {
        method: "PATCH",
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
      console.error("Failed to update payment:", err);
      return null;
    }
  }, [fetchPayments]);

  // Delete payment (unified system)
  const deletePayment = useCallback(async (paymentId: number) => {
    try {
      const res = await fetch(`/api/finance/payments/${paymentId}`, {
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
  }, [fetchPayments]);

  // Delete legacy payment
  const deleteLegacyPayment = useCallback(async (paymentId: number) => {
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
      console.error("Failed to delete legacy payment:", err);
      return false;
    }
  }, [taskId, fetchPayments]);

  // Add meeting
  const addMeeting = useCallback(async (meetingData: { title: string; date: string; startTime?: string; endTime?: string; description?: string; location?: string }) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meetingData),
      });
      const data = await res.json();
      if (data.success) {
        await fetchMeetings();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to add meeting:", err);
      return null;
    }
  }, [taskId, fetchMeetings]);

  // Update meeting
  const updateMeeting = useCallback(async (meetingId: number, updates: Partial<TaskMeeting>) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/meetings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchMeetings();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to update meeting:", err);
      return null;
    }
  }, [taskId, fetchMeetings]);

  // Delete meeting
  const deleteMeeting = useCallback(async (meetingId: number) => {
    if (!taskId) return false;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/meetings?meetingId=${meetingId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchMeetings();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete meeting:", err);
      return false;
    }
  }, [taskId, fetchMeetings]);

  // Add checklist item
  const addChecklistItem = useCallback(async (itemData: { title: string; dueDate?: string; assigneeIds?: number[] }) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      });
      const data = await res.json();
      if (data.success) {
        await fetchChecklist();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to add checklist item:", err);
      return null;
    }
  }, [taskId, fetchChecklist]);

  // Update checklist item
  const updateChecklistItem = useCallback(async (itemId: number, updates: { title?: string; isCompleted?: boolean; dueDate?: string | null; sortOrder?: number }) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        await fetchChecklist();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to update checklist item:", err);
      return null;
    }
  }, [taskId, fetchChecklist]);

  // Toggle checklist item completion
  const toggleChecklistItem = useCallback(async (itemId: number, isCompleted: boolean) => {
    return updateChecklistItem(itemId, { isCompleted });
  }, [updateChecklistItem]);

  // Delete checklist item
  const deleteChecklistItem = useCallback(async (itemId: number) => {
    if (!taskId) return false;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist/${itemId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchChecklist();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete checklist item:", err);
      return false;
    }
  }, [taskId, fetchChecklist]);

  // Add assignee to checklist item
  const addChecklistAssignee = useCallback(async (itemId: number, participantId: number) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist/${itemId}/assignees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchChecklist();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to add checklist assignee:", err);
      return null;
    }
  }, [taskId, fetchChecklist]);

  // Remove assignee from checklist item
  const removeChecklistAssignee = useCallback(async (itemId: number, participantId: number) => {
    if (!taskId) return false;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist/${itemId}/assignees?participantId=${participantId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchChecklist();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to remove checklist assignee:", err);
      return false;
    }
  }, [taskId, fetchChecklist]);

  return {
    task,
    participants,
    videos,
    attachments,
    scheduleItems,
    htmlContent,
    payments,
    unifiedPayments,
    meetings,
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
    updatePayment,
    deletePayment,
    deleteLegacyPayment,
    addMeeting,
    updateMeeting,
    deleteMeeting,
    checklistItems,
    addChecklistItem,
    updateChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    addChecklistAssignee,
    removeChecklistAssignee,
  };
}
