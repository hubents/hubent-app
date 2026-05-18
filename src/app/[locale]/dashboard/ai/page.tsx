"use client";

import { useRef, useEffect, useCallback, useState, Fragment } from "react";
import {
  Sparkles, Plus, Menu, Mail, CheckSquare, DollarSign,
  Users, MapPin, Paperclip, Send, Info, Copy, X, ThumbsUp, ThumbsDown,
} from "lucide-react";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useTranslations } from "next-intl";

// ── Bold markdown renderer ──────────────────────────────────────────────────
function renderWithBold(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} style={{ fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}

// ── Typing indicator ────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <style>{`@keyframes hubiaBlink { 0%,80%,100%{opacity:.25} 40%{opacity:1} }`}</style>
      <div style={{
        width: 30, height: 30, borderRadius: "50%",
        background: "var(--ai-accent)", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Sparkles size={14} />
      </div>
      <div style={{
        padding: "14px 16px", borderRadius: "var(--r-md)",
        background: "var(--bg-panel)", border: "1px solid var(--line-1)",
        display: "flex", gap: 5, alignItems: "center",
      }}>
        {[0, 0.15, 0.3].map((delay, i) => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--ink-3)",
            animation: `hubiaBlink 1.2s infinite ${delay}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Message bubble ──────────────────────────────────────────────────────────
const actionBtn: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--line-1)", color: "var(--ink-3)",
  width: 26, height: 26, borderRadius: 6, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};

function MessageBubble({ role, content, onCopy, onFeedback }: {
  role: "user" | "assistant";
  content: string;
  onCopy?: () => void;
  onFeedback?: (v: number) => void;
}) {
  const tAI = useTranslations("ai");
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexDirection: isUser ? "row-reverse" : "row" }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%",
        background: isUser ? "var(--bg-subtle)" : "var(--ai-accent)",
        color: isUser ? "var(--ink-1)" : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 600, flexShrink: 0,
      }}>
        {isUser ? "U" : <Sparkles size={14} />}
      </div>
      <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: 4, alignItems: isUser ? "flex-end" : "flex-start" }}>
        <div style={{
          padding: "12px 14px", borderRadius: "var(--r-md)",
          background: isUser ? "var(--bg-subtle)" : "var(--bg-panel)",
          border: isUser ? "none" : "1px solid var(--line-1)",
          color: "var(--ink-1)", fontSize: 13.5, lineHeight: 1.6,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {renderWithBold(content)}
        </div>
        {!isUser && content && (
          <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
            <button onClick={onCopy} style={actionBtn} title={tAI("copy")}><Copy size={12} /></button>
            <button onClick={() => onFeedback?.(1)} style={actionBtn} title={tAI("thumbsUp")}><ThumbsUp size={12} /></button>
            <button onClick={() => onFeedback?.(-1)} style={actionBtn} title={tAI("thumbsDown")}><ThumbsDown size={12} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function AIPage() {
  const t = useTranslations("ai");

  const SUGGESTIONS = [
    { Icon: Sparkles,    title: t("suggestions.summarizeTitle"),  prompt: t("suggestions.summarizePrompt") },
    { Icon: Mail,        title: t("suggestions.invitationTitle"), prompt: t("suggestions.invitationPrompt") },
    { Icon: CheckSquare, title: t("suggestions.checklistTitle"),  prompt: t("suggestions.checklistPrompt") },
    { Icon: DollarSign,  title: t("suggestions.savingsTitle"),    prompt: t("suggestions.savingsPrompt") },
    { Icon: Users,       title: t("suggestions.seatingTitle"),    prompt: t("suggestions.seatingPrompt") },
    { Icon: MapPin,      title: t("suggestions.vendorsTitle"),    prompt: t("suggestions.vendorsPrompt") },
  ];

  const INITIAL_THREADS = [
    { id: "t1", title: "Resumen del evento principal",   time: "Hoy, 10:14", preview: "Te he generado el resumen ejecutivo con los KPIs…" },
    { id: "t2", title: "Texto invitación formal",        time: "Ayer",        preview: "Aquí tienes 3 versiones del copy para imprenta…" },
    { id: "t3", title: "Comparativa floristerías",       time: "Lun",         preview: "Comparé Jazmín, Verde Limón y Petalo Blanco…" },
    { id: "t4", title: "Email recordatorio RSVP",        time: "23 Abr",      preview: "Borrador de email para los 14 invitados que…" },
  ];

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [threads, setThreads] = useState(INITIAL_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, input, setInput, isLoading, sendMessage, handleSubmit, clear, sendFeedback } = useAIChat({ context: "dashboard" });

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-grow textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [input]);

  const newThread = useCallback(() => {
    setActiveThreadId(null);
    clear();
    setInput("");
  }, [clear, setInput]);

  const send = useCallback((text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;

    if (!activeThreadId) {
      const id = "t" + Date.now();
      const title = msg.length > 38 ? msg.slice(0, 38) + "…" : msg;
      setThreads(ts => [{ id, title, time: t("now"), preview: msg }, ...ts]);
      setActiveThreadId(id);
    }

    if (text) {
      sendMessage(text);
    } else {
      handleSubmit();
    }
  }, [input, isLoading, activeThreadId, sendMessage, handleSubmit]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div
      className="-m-6 md:-m-8 -mb-20 md:-mb-8"
      style={{ height: "calc(100vh - 62px)" }}
    >
      <div style={{
        display: "grid",
        gridTemplateColumns: sidebarOpen ? "260px 1fr" : "0 1fr",
        height: "100%",
        background: "var(--bg-app)",
        transition: "grid-template-columns .18s ease",
        overflow: "hidden",
      }}>

        {/* ── Sidebar ── */}
        <aside style={{
          borderRight: "1px solid var(--line-1)",
          background: "var(--bg-panel)",
          overflow: "hidden",
          display: sidebarOpen ? "flex" : "none",
          flexDirection: "column",
        }}>
          <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--line-1)" }}>
            <button
              onClick={newThread}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, padding: "9px 12px", borderRadius: "var(--r-sm)",
                background: "var(--color-brand)", color: "var(--color-brand-ink)",
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
              }}
            >
              <Plus size={14} /> {t("newConversation")}
            </button>
          </div>

          <div style={{ padding: "10px 8px", overflowY: "auto", flex: 1 }}>
            <div style={{
              fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".06em",
              color: "var(--ink-3)", padding: "6px 8px 8px", fontWeight: 500,
            }}>
              {t("recent")}
            </div>
            {threads.map(thread => (
              <button
                key={thread.id}
                onClick={() => { setActiveThreadId(thread.id); clear(); }}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 10px",
                  borderRadius: "var(--r-sm)", border: "none",
                  background: activeThreadId === thread.id ? "var(--bg-subtle)" : "transparent",
                  cursor: "pointer", display: "flex", flexDirection: "column", gap: 2, marginBottom: 2,
                  transition: "background .1s",
                }}
                onMouseEnter={e => { if (activeThreadId !== thread.id) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { if (activeThreadId !== thread.id) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <div style={{ fontSize: 13, color: "var(--ink-1)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {thread.title}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {thread.time} · {thread.preview}
                </div>
              </button>
            ))}
          </div>

          <div style={{
            padding: "10px 14px", borderTop: "1px solid var(--line-1)",
            fontSize: 11.5, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 6,
          }}>
            <Info size={12} /> {t("dataPrivacy")}
          </div>
        </aside>

        {/* ── Main panel ── */}
        <section style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Header */}
          <header style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 20px", borderBottom: "1px solid var(--line-1)",
            background: "var(--bg-panel)", flexShrink: 0,
          }}>
            <button
              onClick={() => setSidebarOpen(s => !s)}
              style={{ background: "transparent", border: "none", color: "var(--ink-2)", cursor: "pointer", padding: 4, borderRadius: 6 }}
              title={sidebarOpen ? t("hideSidebar") : t("showSidebar")}
            >
              <Menu size={18} />
            </button>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "var(--ai-accent)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Sparkles size={14} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>HubIA</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{t("subtitle")}</div>
            </div>
            <select
              defaultValue="hubia-pro"
              style={{
                fontSize: 12, padding: "6px 10px",
                border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)",
                background: "var(--bg-panel)", color: "var(--ink-2)", cursor: "pointer",
              }}
            >
              <option value="hubia-pro">HubIA Pro</option>
              <option value="hubia-fast">HubIA Fast</option>
            </select>
          </header>

          {/* Messages / Welcome */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              {isEmpty ? (
                <div style={{ paddingTop: 32 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "var(--ai-accent)", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px",
                  }}>
                    <Sparkles size={26} />
                  </div>
                  <h2 style={{
                    textAlign: "center", fontSize: 24, fontWeight: 600,
                    color: "var(--ink-1)", margin: "0 0 6px", letterSpacing: "-0.01em",
                  }}>
                    {t("welcomeTitle")}
                  </h2>
                  <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-3)", margin: "0 0 28px" }}>
                    {t("welcomeSubtitle")}
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s.title}
                        onClick={() => send(s.prompt)}
                        style={{
                          textAlign: "left", padding: "14px 16px",
                          border: "1px solid var(--line-1)", borderRadius: "var(--r-md)",
                          background: "var(--bg-panel)", cursor: "pointer",
                          display: "flex", flexDirection: "column", gap: 6,
                          transition: "border-color .15s, box-shadow .15s",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ink-3)";
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--shadow-1)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line-1)";
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-2)" }}>
                          <s.Icon size={14} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>{s.title}</span>
                        </div>
                        <div style={{
                          fontSize: 12, color: "var(--ink-3)", lineHeight: 1.45,
                          overflow: "hidden", display: "-webkit-box",
                          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        } as React.CSSProperties}>
                          {s.prompt}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {messages.map(m => (
                    <MessageBubble
                      key={m.id}
                      role={m.role}
                      content={m.content}
                      onCopy={() => navigator.clipboard?.writeText(m.content)}
                      onFeedback={v => sendFeedback(m.id, v)}
                    />
                  ))}
                  {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                    <TypingIndicator />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div style={{ padding: "14px 20px 20px", borderTop: "1px solid var(--line-1)", background: "var(--bg-panel)", flexShrink: 0 }}>
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              <div style={{
                display: "flex", alignItems: "flex-end", gap: 8,
                padding: "10px 10px 10px 14px",
                border: "1px solid var(--line-1)", borderRadius: "var(--r-md)",
                background: "var(--bg-panel)", boxShadow: "var(--shadow-1)",
              }}>
                <button
                  title={t("attach")}
                  style={{ background: "transparent", border: "none", color: "var(--ink-3)", cursor: "pointer", padding: 6, borderRadius: 6, flexShrink: 0 }}
                >
                  <Paperclip size={16} />
                </button>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={t("inputPlaceholder")}
                  disabled={isLoading}
                  style={{
                    flex: 1, resize: "none", border: "none", outline: "none",
                    fontFamily: "inherit", fontSize: 13.5, color: "var(--ink-1)",
                    background: "transparent", padding: "6px 0", maxHeight: 180, lineHeight: 1.5,
                  }}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || isLoading}
                  style={{
                    width: 34, height: 34, padding: 0, borderRadius: "var(--r-sm)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "none", cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
                    background: input.trim() && !isLoading ? "var(--color-brand)" : "var(--bg-subtle)",
                    color: input.trim() && !isLoading ? "var(--color-brand-ink)" : "var(--ink-3)",
                    flexShrink: 0, transition: "background .15s",
                  }}
                  title={t("send")}
                >
                  <Send size={14} />
                </button>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 8 }}>
                {t("disclaimer")}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
