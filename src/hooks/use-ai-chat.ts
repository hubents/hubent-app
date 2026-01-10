"use client";

import { useState, useCallback, useRef, useEffect } from "react";

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
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [suggestions, setSuggestions] = useState<string[]>([
    "¿Cuáles son mis próximos eventos?",
    "¿Tengo tareas pendientes?",
    "Dame un resumen del día",
  ]);
  
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      createdAt: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");

    const allMessages = [...messages, userMessage];
    const apiMessages = allMessages.map(m => ({ role: m.role, content: m.content }));

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, sessionId, context }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `Error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No se pudo leer la respuesta");

      const decoder = new TextDecoder();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      let fullContent = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
            updated[lastIdx] = { ...updated[lastIdx], content: fullContent };
          }
          return updated;
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Error desconocido");
      setMessages(prev => prev.filter(m => m.content.length > 0));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, isLoading, sessionId, context]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    sendMessage(input);
  }, [input, sendMessage]);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

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

  return { messages, input, setInput, isLoading, error, suggestions, handleSubmit, sendMessage, stop, clear, sendFeedback };
}
