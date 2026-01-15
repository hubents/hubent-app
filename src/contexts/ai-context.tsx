"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type AIContextType = 
  | { type: "global"; pathname?: string }
  | { type: "task"; taskId: number; taskTitle?: string; taskData?: Record<string, unknown> }
  | { type: "event"; eventId: number; eventTitle?: string; eventData?: Record<string, unknown> }
  | { type: "contact"; contactId: number; contactName?: string }
  | { type: "lead"; leadId: number; leadTitle?: string };

interface AIContextState {
  isOpen: boolean;
  context: AIContextType;
  openAI: (context: AIContextType) => void;
  closeAI: () => void;
  setContext: (context: AIContextType) => void;
}

const AIContext = createContext<AIContextState | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContextState] = useState<AIContextType>({ type: "global" });

  const openAI = useCallback((newContext: AIContextType) => {
    setContextState(newContext);
    setIsOpen(true);
  }, []);

  const closeAI = useCallback(() => {
    setIsOpen(false);
  }, []);

  const setContext = useCallback((newContext: AIContextType) => {
    setContextState(newContext);
  }, []);

  return (
    <AIContext.Provider value={{ isOpen, context, openAI, closeAI, setContext }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error("useAI must be used within an AIProvider");
  }
  return context;
}

export function getContextString(context: AIContextType): string {
  switch (context.type) {
    case "task":
      return `task:${context.taskId}`;
    case "event":
      return `event:${context.eventId}`;
    case "contact":
      return `contact:${context.contactId}`;
    case "lead":
      return `lead:${context.leadId}`;
    case "global":
    default:
      return context.pathname || "dashboard";
  }
}

export function getContextSuggestions(context: AIContextType): string[] {
  switch (context.type) {
    case "task":
      return [
        "Resume esta tarea",
        "¿Quién está asignado?",
        "Genera subtareas",
        "¿Cuál es la fecha límite?",
      ];
    case "event":
      return [
        "Resume este evento",
        "¿Qué tareas faltan?",
        "Lista los proveedores",
        "¿Cuántos invitados hay?",
      ];
    case "contact":
      return [
        "Resume este contacto",
        "¿Qué eventos tiene asociados?",
        "Historial de actividad",
      ];
    case "lead":
      return [
        "Resume este lead",
        "¿Cuál es la probabilidad de cierre?",
        "Próximos pasos sugeridos",
      ];
    case "global":
    default:
      return [
        "¿Cuáles son mis próximos eventos?",
        "¿Tengo tareas pendientes?",
        "Dame un resumen del día",
      ];
  }
}
