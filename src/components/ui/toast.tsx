"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiAlertLine,
  RiCloseLine,
} from "@remixicon/react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration || 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

const iconMap = {
  success: RiCheckboxCircleLine,
  error: RiErrorWarningLine,
  warning: RiAlertLine,
  info: RiInformationLine,
};

const colorMap = {
  success: "border-l-[var(--success)] bg-[var(--success-light)]",
  error: "border-l-[var(--destructive)] bg-[var(--destructive-light)]",
  warning: "border-l-[var(--warning)] bg-[var(--warning-light)]",
  info: "border-l-[var(--info)] bg-[var(--info-light)]",
};

const iconColorMap = {
  success: "text-[var(--success)]",
  error: "text-[var(--destructive)]",
  warning: "text-[var(--warning)]",
  info: "text-[var(--info)]",
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = iconMap[toast.type];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-md)] border border-l-4 p-4 shadow-[var(--shadow-lg)] animate-in slide-in-from-right-full duration-300",
        colorMap[toast.type]
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconColorMap[toast.type])} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{toast.title}</p>
        {toast.description && (
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 p-1 rounded-[var(--radius)] hover:bg-black/10 transition-colors"
      >
        <RiCloseLine className="h-4 w-4" />
      </button>
    </div>
  );
}

export { ToastContainer, ToastItem };
