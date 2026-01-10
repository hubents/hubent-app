"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface UseAIChatOptions {
  context?: string;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { context = "dashboard" } = options;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const abortControllerRef = useRef<AbortController | null>(null);

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
        // Usar sugerencias por defecto
        setSuggestions([
          "¿Cuáles son mis próximos eventos?",
          "¿Tengo tareas pendientes?",
          "Dame un resumen del día",
        ]);
      }
    }
    loadSuggestions();
  }, [context]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      createdAt: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");

    // Preparar mensajes para la API
    const apiMessages = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          sessionId,
          context,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      // Leer stream de respuesta
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Procesar líneas completas (SSE format: data: {...})
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            
            // SSE format: "data: {...}" o "event: ..." 
            if (trimmed.startsWith("data: ")) {
              const jsonStr = trimmed.slice(6);
              try {
                const data = JSON.parse(jsonStr);
                // UI Message Stream format
                if (data.type === "text" && data.value) {
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastMessage = updated[updated.length - 1];
                    if (lastMessage.role === "assistant") {
                      lastMessage.content += data.value;
                    }
                    return updated;
                  });
                }
              } catch {
                // Ignorar errores de parsing
              }
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Error desconocido");
      // Remover mensaje del asistente vacío si hay error
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
      console.error("Error enviando feedback");
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
    sendFeedback,
  };
}
