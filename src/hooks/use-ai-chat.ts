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
  
  const [suggestions, setSuggestions] = useState<string[]>([
    "¿Cuáles son mis próximos eventos?",
    "¿Tengo tareas pendientes?",
    "Dame un resumen del día",
  ]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState("");

  // Crear transport con configuración personalizada
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/ai/chat",
    body: {
      sessionId,
      context,
    },
  }), [sessionId, context]);

  // Hook oficial de AI SDK - maneja el streaming automáticamente
  const {
    messages: chatMessages,
    sendMessage: originalSendMessage,
    status,
    stop,
    setMessages: setChatMessages,
    error: chatError,
  } = useChat({
    transport,
  });

  // Cargar sugerencias iniciales
  useEffect(() => {
    async function loadSuggestions() {
      try {
        const res = await fetch(`/api/ai/chat?context=${context}`);
        if (res.ok) {
          const data = await res.json();
          if (data.suggestions) setSuggestions(data.suggestions);
        }
      } catch {
        // Usar sugerencias por defecto
      }
    }
    loadSuggestions();
  }, [context]);

  // Convertir mensajes al formato esperado por los componentes
  const messages: Message[] = useMemo(() => 
    chatMessages.map(m => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map(p => p.text)
        .join("") || "",
      createdAt: new Date(),
    })),
    [chatMessages]
  );

  const isLoading = status === "streaming" || status === "submitted";
  const error = chatError?.message || null;

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      originalSendMessage({ text: input });
      setInput("");
    }
  }, [input, isLoading, originalSendMessage]);

  const sendMessage = useCallback((content: string) => {
    if (content.trim() && !isLoading) {
      originalSendMessage({ text: content });
    }
  }, [isLoading, originalSendMessage]);

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
      // Silenciar error
    }
  }, []);

  return { 
    messages, 
    input, 
    setInput, 
    isLoading, 
    error, 
    suggestions, 
    handleSubmit, 
    sendMessage, 
    stop, 
    clear, 
    sendFeedback 
  };
}
