"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Notification01Icon,
  Tick02Icon,
  Delete01Icon,
  TaskDone01Icon,
  Comment01Icon,
  Alert02Icon,
  Wallet01Icon,
  UserCheck01Icon,
  Clock01Icon,
  UserAdd01Icon,
  Target01Icon,
  PartyIcon,
  UserGroupIcon,
  Notification03Icon,
} from "@hugeicons/core-free-icons";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { es } from "date-fns/locale";
import { useNotificationSound } from "@/hooks/use-notification-sound";

const IcoBell = hgIcon(Notification01Icon);
const IcoBellActive = hgIcon(Notification03Icon);
const IcoCheck = hgIcon(Tick02Icon);
const IcoDelete = hgIcon(Delete01Icon);

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, string>;
}

const TYPE_CONFIG: Record<string, { icon: ReturnType<typeof hgIcon>; bg: string; ink: string }> = {
  task_assigned:             { icon: hgIcon(TaskDone01Icon),   bg: "#DBEAFE", ink: "#1E40AF" },
  task_status_changed:       { icon: hgIcon(TaskDone01Icon),   bg: "#D1FAE5", ink: "#065F46" },
  new_message:               { icon: hgIcon(Comment01Icon),    bg: "#FEF3C7", ink: "#92400E" },
  mention:                   { icon: hgIcon(Alert02Icon),      bg: "#FCE7F3", ink: "#9D174D" },
  payment_registered:        { icon: hgIcon(Wallet01Icon),     bg: "#D1FAE5", ink: "#065F46" },
  payment_received:          { icon: hgIcon(Wallet01Icon),     bg: "#D1FAE5", ink: "#065F46" },
  rsvp_received:             { icon: hgIcon(UserCheck01Icon),  bg: "#EDE9FE", ink: "#5B21B6" },
  event_reminder:            { icon: hgIcon(Clock01Icon),      bg: "#FEE2E2", ink: "#991B1B" },
  new_contact:               { icon: hgIcon(UserAdd01Icon),    bg: "#DBEAFE", ink: "#1E40AF" },
  new_lead:                  { icon: hgIcon(Target01Icon),     bg: "#FEF3C7", ink: "#92400E" },
  new_event:                 { icon: hgIcon(PartyIcon),        bg: "#EDE9FE", ink: "#5B21B6" },
  collaboration_invitation:  { icon: hgIcon(UserGroupIcon),    bg: "#D1FAE5", ink: "#065F46" },
  collaboration_accepted:    { icon: hgIcon(UserGroupIcon),    bg: "#D1FAE5", ink: "#065F46" },
};

const DEFAULT_CONFIG = { icon: hgIcon(Notification01Icon), bg: "#F3F4F6", ink: "#374151" };

function getGroup(dateStr: string): "today" | "yesterday" | "week" | "older" {
  const d = new Date(dateStr);
  if (isToday(d)) return "today";
  if (isYesterday(d)) return "yesterday";
  if (isThisWeek(d)) return "week";
  return "older";
}

const GROUP_LABELS: Record<string, string> = {
  today: "Hoy",
  yesterday: "Ayer",
  week: "Esta semana",
  older: "Antes",
};

export function NotificationCenter() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { playSound } = useNotificationSound();
  const panelRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30");
      if (!res.ok) return;
      const data = await res.json();
      const newCount: number = data.unreadCount ?? 0;
      if (newCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
        playSound();
      }
      prevUnreadRef.current = newCount;
      setNotifications(data.data ?? []);
      setUnreadCount(newCount);
    } catch {
      // silently ignore
    }
  }, [playSound]);

  // Initial load + 30s polling
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Refresh when panel opens
  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const id = window.setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { window.clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [isOpen]);

  const markAllRead = async () => {
    setIsLoading(true);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => null);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    prevUnreadRef.current = 0;
    setIsLoading(false);
  };

  const markAsRead = async (id: number) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: [id] }),
    }).catch(() => null);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
  };

  const deleteNotification = async (id: number) => {
    await fetch(`/api/notifications?id=${id}`, { method: "DELETE" }).catch(() => null);
    const removed = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (removed && !removed.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
      prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
    }
  };

  const handleClick = (n: Notification) => {
    if (!n.read) markAsRead(n.id);
    if (n.link) router.push(n.link);
    setIsOpen(false);
  };

  // Group notifications
  const groups: Array<{ key: string; label: string; items: Notification[] }> = [];
  const ORDER = ["today", "yesterday", "week", "older"];
  const grouped: Record<string, Notification[]> = {};
  for (const n of notifications) {
    const g = getGroup(n.createdAt);
    (grouped[g] = grouped[g] ?? []).push(n);
  }
  for (const key of ORDER) {
    if (grouped[key]?.length) {
      groups.push({ key, label: GROUP_LABELS[key], items: grouped[key] });
    }
  }

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="cursor-pointer border-none"
        style={{
          background: isOpen ? "var(--bg-subtle)" : "transparent",
          padding: "6px 8px",
          borderRadius: 8,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          color: "var(--ink-2)",
        }}
        title="Notificaciones"
      >
        {unreadCount > 0 ? (
          <IcoBellActive className="h-5 w-5" />
        ) : (
          <IcoBell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 3,
              right: 3,
              minWidth: 16,
              height: 16,
              borderRadius: 999,
              background: "#EF4444",
              color: "#FFFFFF",
              fontSize: 10,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              lineHeight: 1,
              border: "1.5px solid #FFFFFF",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            maxHeight: 520,
            background: "#FFFFFF",
            border: "1px solid var(--line-1)",
            borderRadius: 14,
            boxShadow: "0 16px 48px rgba(15,16,18,.12), 0 4px 12px rgba(15,16,18,.07)",
            display: "flex",
            flexDirection: "column",
            zIndex: 200,
            overflow: "hidden",
          }}
        >
          {/* Panel header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px 12px",
              borderBottom: "1px solid var(--line-1)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>
                Notificaciones
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: "#EF4444",
                    color: "#FFF",
                    borderRadius: 999,
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "1px 7px",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={isLoading}
                className="cursor-pointer border-none"
                style={{
                  background: "transparent",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--ink-3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 6px",
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <IcoCheck className="h-3.5 w-3.5" />
                Marcar todo leído
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "var(--ink-3)",
                  fontSize: 13,
                }}
              >
                <IcoBell
                  className="h-8 w-8 mx-auto mb-3"
                  style={{ opacity: 0.3 }}
                />
                <div>Sin notificaciones por ahora</div>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.key}>
                  <div
                    style={{
                      padding: "8px 16px 4px",
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: "var(--ink-3)",
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                      background: "var(--bg-subtle)",
                      borderBottom: "1px solid var(--line-1)",
                    }}
                  >
                    {group.label}
                  </div>
                  {group.items.map((n) => {
                    const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_CONFIG;
                    const Icon = cfg.icon;
                    const timeAgo = formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                      locale: es,
                    });
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleClick(n)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          padding: "11px 16px",
                          cursor: n.link ? "pointer" : "default",
                          background: n.read ? "transparent" : "#F5F7FF",
                          borderBottom: "1px solid var(--line-1)",
                          position: "relative",
                        }}
                        className="group"
                        onMouseEnter={(e) => {
                          if (n.read) e.currentTarget.style.background = "var(--bg-subtle)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = n.read ? "transparent" : "#F5F7FF";
                        }}
                      >
                        {/* Icon */}
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: cfg.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon className="h-4 w-4" style={{ color: cfg.ink }} />
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: n.read ? 400 : 600,
                              color: "var(--ink-1)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {n.title}
                          </div>
                          {n.body && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--ink-3)",
                                marginTop: 1,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {n.body}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--ink-3)",
                              marginTop: 3,
                            }}
                          >
                            {timeAgo}
                          </div>
                        </div>

                        {/* Unread dot */}
                        {!n.read && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: "#3B82F6",
                              flexShrink: 0,
                              marginTop: 5,
                            }}
                          />
                        )}

                        {/* Delete button (visible on hover) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 cursor-pointer border-none transition-opacity"
                          style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            background: "var(--bg-subtle)",
                            color: "var(--ink-3)",
                            padding: 4,
                            borderRadius: 6,
                            display: "flex",
                          }}
                        >
                          <IcoDelete className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
