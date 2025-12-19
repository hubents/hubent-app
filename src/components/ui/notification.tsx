"use client";

import { cn } from "@/lib/utils";
import { RiCloseLine, RiCheckLine, RiErrorWarningLine, RiInformationLine, RiAlertLine } from "@remixicon/react";
import { Avatar } from "./avatar";

interface NotificationProps {
  title: string;
  message?: string;
  time?: string;
  avatar?: string;
  type?: "default" | "success" | "error" | "warning" | "info";
  onClose?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
  unread?: boolean;
}

const typeIcons = {
  default: null,
  success: <RiCheckLine className="h-5 w-5 text-[var(--success)]" />,
  error: <RiErrorWarningLine className="h-5 w-5 text-[var(--destructive)]" />,
  warning: <RiAlertLine className="h-5 w-5 text-[var(--warning)]" />,
  info: <RiInformationLine className="h-5 w-5 text-[var(--info)]" />,
};

const typeBg = {
  default: "",
  success: "bg-[var(--success)]/10",
  error: "bg-[var(--destructive)]/10",
  warning: "bg-[var(--warning)]/10",
  info: "bg-[var(--info)]/10",
};

const Notification = ({
  title,
  message,
  time,
  avatar,
  type = "default",
  onClose,
  onAction,
  actionLabel,
  className,
  unread = false,
}: NotificationProps) => {
  return (
    <div
      className={cn(
        "relative flex gap-3 rounded-[var(--radius)] border border-[var(--border)] p-4 transition-all animate-slide-in-right",
        typeBg[type],
        unread && "border-l-4 border-l-[var(--primary)]",
        className
      )}
    >
      {/* Avatar or Icon */}
      {avatar ? (
        <Avatar className="h-10 w-10" />
      ) : typeIcons[type] ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--muted)]">
          {typeIcons[type]}
        </div>
      ) : null}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">{title}</p>
          {time && (
            <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">{time}</span>
          )}
        </div>
        {message && (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{message}</p>
        )}
        {onAction && actionLabel && (
          <button
            onClick={onAction}
            className="mt-2 text-sm font-medium text-[var(--primary)] hover:underline"
          >
            {actionLabel}
          </button>
        )}
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded p-1 transition-colors hover:bg-[var(--muted)]"
        >
          <RiCloseLine className="h-4 w-4" />
        </button>
      )}

      {/* Unread Indicator */}
      {unread && (
        <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse" />
      )}
    </div>
  );
};

export { Notification };
