"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePrivateChannel } from "./use-pusher";
import { EVENTS } from "@/lib/pusher";

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
  const [isRealtime, setIsRealtime] = useState(false);
  const lastMessageIdRef = useRef<number | null>(null);

  // Pusher channel for real-time updates
  const channelName = taskId ? `private-task-${taskId}` : null;
  const { channel, bind } = usePrivateChannel(channelName);

  const fetchMessages = useCallback(async () => {
    if (!taskId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
        // Track last message ID for deduplication
        if (data.data.length > 0) {
          lastMessageIdRef.current = data.data[data.data.length - 1].id;
        }
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

  // Real-time message updates via Pusher
  useEffect(() => {
    if (!channel) {
      setIsRealtime(false);
      return;
    }

    setIsRealtime(true);

    // New message received
    const unbindNew = bind<TaskMessage>(EVENTS.MESSAGE_NEW, (newMessage) => {
      // Avoid duplicates - check if we already have this message
      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
      lastMessageIdRef.current = newMessage.id;
    });

    // Message edited
    const unbindEdit = bind<TaskMessage>(EVENTS.MESSAGE_EDITED, (editedMessage) => {
      setMessages(prev => 
        prev.map(m => m.id === editedMessage.id ? editedMessage : m)
      );
    });

    // Message deleted
    const unbindDelete = bind<{ id: number }>(EVENTS.MESSAGE_DELETED, (data) => {
      setMessages(prev => prev.filter(m => m.id !== data.id));
    });

    // File uploaded (refresh to get attachment info)
    const unbindFile = bind<{ messageId: number }>(EVENTS.FILE_UPLOADED, () => {
      // Refetch to get full attachment data
      fetchMessages();
    });

    return () => {
      unbindNew?.();
      unbindEdit?.();
      unbindDelete?.();
      unbindFile?.();
    };
  }, [channel, bind, fetchMessages]);

  // Fallback polling: only if Pusher is not connected (every 60 seconds)
  useEffect(() => {
    if (!taskId || isRealtime) return;
    
    const interval = setInterval(() => {
      // Silent fetch - don't show loading state
      fetch(`/api/tasks/${taskId}/messages`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setMessages(data.data);
          }
        })
        .catch(() => {}); // Silent fail for polling
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [taskId, isRealtime]);

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
      // Log error for debugging
      console.error("Failed to send message - API error:", data.error);
      throw new Error(data.error?.message || "Failed to send message");
    } catch (err) {
      console.error("Failed to send message:", err);
      throw err; // Re-throw so caller can handle
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
    isRealtime,
    refetch: fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
  };
}
