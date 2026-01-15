"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";

interface Event {
  id: number;
  name: string;
  type: string;
  status: string;
  date: string | null;
  location: string | null;
}

interface EventContextType {
  activeEvent: Event | null;
  setActiveEvent: (event: Event | null) => void;
  isEventView: boolean;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [isEventView, setIsEventView] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Load last active event from localStorage
    const stored = localStorage.getItem("hubents_active_event");
    if (stored) {
      try {
        setActiveEvent(JSON.parse(stored));
      } catch {
        localStorage.removeItem("hubents_active_event");
      }
    }
  }, []);

  // Limpiar activeEvent cuando se navega fuera de la ruta del evento
  useEffect(() => {
    if (activeEvent) {
      const eventPath = `/dashboard/events/${activeEvent.id}`;
      if (!pathname.startsWith(eventPath)) {
        setActiveEvent(null);
      }
    }
  }, [pathname, activeEvent]);

  useEffect(() => {
    // Persist active event
    if (activeEvent) {
      localStorage.setItem("hubents_active_event", JSON.stringify(activeEvent));
      setIsEventView(true);
    } else {
      localStorage.removeItem("hubents_active_event");
      setIsEventView(false);
    }
  }, [activeEvent]);

  return (
    <EventContext.Provider value={{ activeEvent, setActiveEvent, isEventView }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
}
