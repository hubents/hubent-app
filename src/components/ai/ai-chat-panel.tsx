"use client";

import { useRef, useEffect } from "react";
import { X, Send, Sparkles, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AIMessage } from "./ai-message";
import { useAIChat } from "@/hooks/use-ai-chat";
import { cn } from "@/lib/utils";

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
}

export function AIChatPanel({ isOpen, onClose, context }: AIChatPanelProps) {
  const {
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
  } = useAIChat({ context });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al nuevo mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus en input cuando se abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[90]"
        onClick={onClose}
      />

      {/* Panel - Right side, opens upward from button */}
      <div
        className={cn(
          "fixed z-[100] bg-card border border-border shadow-2xl flex flex-col rounded-2xl",
          // Position - Bottom right, above the button
          "right-4 bottom-36 md:right-6 md:bottom-24",
          // Size
          "w-[90vw] max-w-md h-[60vh] max-h-[500px]",
          // Animation
          "animate-in slide-in-from-bottom-4 fade-in duration-200"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--foreground)]">Enti</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Tu asistente IA {/* HIDDEN TEMPORARILY: • by NapsixAI */}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clear}
                className="h-8 w-8 text-[var(--muted-foreground)]"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-violet-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">¡Hola! Soy Enti 👋</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-[280px] mx-auto">
                Tu asistente inteligente para gestionar eventos, tareas y más.
              </p>

              {/* Sugerencias */}
              <div className="space-y-2">
                <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
                  Prueba preguntando
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(suggestion)}
                      className="px-3 py-1.5 text-sm bg-[var(--muted)] hover:bg-[var(--accent)] rounded-full transition-colors text-[var(--foreground)]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4">
              {messages.map((message) => (
                <AIMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  isLoading={isLoading && message === messages[messages.length - 1] && message.role === "assistant"}
                  onFeedback={(rating) => sendFeedback(message.id, rating)}
                />
              ))}
              
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <AIMessage role="assistant" content="" isLoading />
              )}
            </div>
          )}
        </ScrollArea>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <span>Error: {error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => sendMessage(messages[messages.length - 1]?.content || "")}
                className="h-6 text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reintentar
              </Button>
            </p>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-[var(--border)]">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              disabled={isLoading}
              className="flex-1"
            />
            {isLoading ? (
              <Button type="button" onClick={stop} variant="outline" size="icon">
                <X className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim()}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </form>
          <p className="text-[10px] text-center text-[var(--muted-foreground)] mt-2">
            Enti puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </div>
    </>
  );
}
