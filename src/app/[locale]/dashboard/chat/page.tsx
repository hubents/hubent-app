"use client";

import { hgIcon } from "@/components/ui/hg-icon";
import {
  Search01Icon,
  SentIcon,
  Mail01Icon,
  Cancel01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { getInitials } from "@/lib/ui-utils";
import { useTranslations } from "next-intl";

const IcoSearch = hgIcon(Search01Icon);
const IcoSend   = hgIcon(SentIcon);
const IcoGroup  = hgIcon(Mail01Icon);
const IcoClose  = hgIcon(Cancel01Icon);
const IcoUser   = hgIcon(UserCircleIcon);

const conversations = [
  { id: "1", name: "Equipo Boda García-López", lastMessage: "¿Confirmamos el menú para mañana?", time: "10:30", unread: 3, isGroup: true },
  { id: "2", name: "Carlos López",             lastMessage: "Ya envié el contrato al fotógrafo",   time: "09:15", unread: 0, isGroup: false },
  { id: "3", name: "Ana Martínez",             lastMessage: "Perfecto, nos vemos en la reunión",   time: "Ayer",  unread: 0, isGroup: false },
  { id: "4", name: "Equipo Boda Martínez-Ruiz",lastMessage: "Las invitaciones están listas",       time: "Ayer",  unread: 1, isGroup: true },
  { id: "5", name: "Pedro Ruiz",               lastMessage: "¿Tienes el contacto del DJ?",         time: "Lun",   unread: 0, isGroup: false },
];

const messages = [
  { id: "1", sender: "María García",  content: "Buenos días equipo! ¿Cómo vamos con los preparativos?",  time: "09:00", isMe: false },
  { id: "2", sender: "Carlos López",  content: "Todo en orden. El catering confirmó el menú final.",      time: "09:05", isMe: false },
  { id: "3", sender: "Yo",            content: "Excelente! ¿Ya tenemos la lista de invitados actualizada?", time: "09:10", isMe: true  },
  { id: "4", sender: "Ana Martínez",  content: "Sí, la actualicé ayer. Son 148 confirmados.",             time: "09:15", isMe: false },
  { id: "5", sender: "María García",  content: "Perfecto. ¿Confirmamos el menú para mañana?",             time: "10:30", isMe: false },
];


export default function ChatPage() {
  const t = useTranslations("chat");
  return (
    <div style={{ height: "calc(100vh - 8rem)", display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>

      {/* ── Sidebar: lista de conversaciones ── */}
      <div
        style={{
          background: "#FFFFFF", border: "1px solid var(--line-1)",
          borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line-1)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)", marginBottom: 10 }}>
            {t("title")}
          </div>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--bg-subtle)", borderRadius: 8, padding: "7px 12px",
            }}
          >
            <IcoSearch style={{ width: 13, height: 13, color: "var(--ink-3)", flexShrink: 0 }} />
            <input
              placeholder={t("searchPlaceholder")}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--ink-1)", fontFamily: "inherit" }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.map((conv, i) => (
            <div
              key={conv.id}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 18px", cursor: "pointer",
                background: i === 0 ? "var(--bg-subtle)" : "transparent",
                borderBottom: "1px solid var(--line-2)",
                transition: "background .1s",
              }}
              onMouseEnter={(e) => { if (i !== 0) e.currentTarget.style.background = "var(--bg-subtle)"; }}
              onMouseLeave={(e) => { if (i !== 0) e.currentTarget.style.background = "transparent"; }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: conv.isGroup ? "#E3F2FF" : "#EDE7DC",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  color: conv.isGroup ? "#1565C0" : "#5C4A2E",
                }}
              >
                {getInitials(conv.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {conv.name}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ink-3)", flexShrink: 0 }}>{conv.time}</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {conv.lastMessage}
                </p>
              </div>
              {conv.unread > 0 && (
                <div
                  style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: "var(--color-primary)", color: "#FFF",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {conv.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main: área de chat ── */}
      <div
        style={{
          background: "#FFFFFF", border: "1px solid var(--line-1)",
          borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Chat header */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 20px", borderBottom: "1px solid var(--line-1)",
          }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: "#E3F2FF",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#1565C0",
            }}
          >
            EB
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>
              Equipo Boda García-López
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>4 miembros · 2 en línea</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.isMe ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "70%" }}>
                {!msg.isMe && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", marginBottom: 3 }}>
                    {msg.sender}
                  </div>
                )}
                <div
                  style={{
                    padding: "9px 14px", borderRadius: 10, fontSize: 13,
                    background: msg.isMe ? "var(--color-primary)" : "var(--bg-subtle)",
                    color: msg.isMe ? "#FFFFFF" : "var(--ink-1)",
                    borderTopRightRadius: msg.isMe ? 3 : 10,
                    borderTopLeftRadius: msg.isMe ? 10 : 3,
                  }}
                >
                  {msg.content}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 3, textAlign: msg.isMe ? "right" : "left" }}>
                  {msg.time}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 18px", borderTop: "1px solid var(--line-1)",
          }}
        >
          <input
            placeholder={t("inputPlaceholder")}
            style={{
              flex: 1, border: "1px solid var(--line-1)", borderRadius: 8,
              padding: "9px 14px", fontSize: 13, fontFamily: "inherit",
              background: "#FFFFFF", color: "var(--ink-1)", outline: "none",
            }}
          />
          <button
            style={{
              width: 36, height: 36, borderRadius: 8, border: "none", flexShrink: 0,
              background: "var(--color-primary)", color: "#FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <IcoSend style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

    </div>
  );
}
