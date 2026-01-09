import { useState, useEffect, useCallback } from "react";

interface TaskMessage {
  id: number;
  taskId: number;
  senderId: string;
  senderName?: string;
  senderEmail?: string;
  senderImage?: string;
  type: string;
  content: string;
  isPrivate: boolean;
  visibleTo: string[] | null;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  attachments?: TaskMessageAttachment[];
}

interface TaskMessageAttachment {
  id: number;
  name: string;
  url: string;
  type: string;
  size: number | null;
  mimeType: string | null;
}

export function useTaskMessages(taskId: number | null) {
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!taskId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      } else {
        setError(data.error?.message || "Failed to fetch messages");
      }
    } catch (err) {
      setError("Failed to fetch messages");
      console.error("Failed to fetch messages:", err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Send message
  const sendMessage = useCallback(async (messageData: {
    content: string;
    type?: string;
    isPrivate?: boolean;
    visibleTo?: string[];
  }) => {
    if (!taskId) return null;
    
    setSending(true);
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });
      const data = await res.json();
      if (data.success) {
        await fetchMessages();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to send message:", err);
      return null;
    } finally {
      setSending(false);
    }
  }, [taskId, fetchMessages]);

  // Edit message
  const editMessage = useCallback(async (messageId: number, content: string) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, content }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchMessages();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to edit message:", err);
      return null;
    }
  }, [taskId, fetchMessages]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: number) => {
    if (!taskId) return false;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/messages?messageId=${messageId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchMessages();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete message:", err);
      return false;
    }
  }, [taskId, fetchMessages]);

  return {
    messages,
    loading,
    error,
    sending,
    refetch: fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
  };
}
