"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect, useCallback, useMemo } from "react";

interface UseAIChatOptions {
  context?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { context = "dashboard" } = options;
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState("");

  // Crear transport con body personalizado
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/ai/chat",
    body: {
      sessionId,
      context,
    },
  }), [sessionId, context]);

  // Usar el hook oficial de AI SDK v6
  const {
    messages: chatMessages,
    sendMessage: originalSendMessage,
    status,
    stop,
    setMessages: setChatMessages,
    error,
  } = useChat({
    transport,
  });

  // Cargar sugerencias iniciales
  useEffect(() => {
    async function loadSuggestions() {
      try {
        const res = await fetch(`/api/ai/chat?context=${context}`);
        const data = await res.json();
        if (data.suggestions) {
          setSuggestions(data.suggestions);
        }
      } catch {
        setSuggestions([
          "¿Cuáles son mis próximos eventos?",
          "¿Tengo tareas pendientes?",
          "Dame un resumen del día",
        ]);
      }
    }
    loadSuggestions();
  }, [context]);

  // Convertir mensajes al formato esperado por los componentes
  const messages: Message[] = chatMessages.map(m => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map(p => p.text)
      .join("") || "",
    createdAt: new Date(),
  }));

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && status === "ready") {
      originalSendMessage({ text: input });
      setInput("");
    }
  }, [input, status, originalSendMessage]);

  const sendMessage = useCallback((content: string) => {
    if (content.trim() && status === "ready") {
      originalSendMessage({ text: content });
    }
  }, [status, originalSendMessage]);

  const clear = useCallback(() => {
    setChatMessages([]);
  }, [setChatMessages]);

  const sendFeedback = useCallback(async (messageId: string, rating: number, comment?: string) => {
    try {
      await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, rating, comment }),
      });
    } catch {
      console.error("Error enviando feedback");
    }
  }, []);

  return {
    messages,
    input,
    setInput,
    isLoading,
    error: error?.message || null,
    suggestions,
    handleSubmit,
    sendMessage,
    stop,
    clear,
    sendFeedback,
  };
}
