"use client";

import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

function ConfirmUI({
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const dismiss = (result: boolean) => {
    setVisible(false);
    setTimeout(() => (result ? onConfirm() : onCancel()), 160);
  };

  const confirmBg = variant === "destructive" ? "#B8412D" : "#2563EB";
  const confirmHover = variant === "destructive" ? "#9B3526" : "#1D4ED8";

  return (
    <div
      onClick={() => dismiss(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: visible ? "rgba(0,0,0,0.38)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(2px)" : "none",
        transition: "background 160ms ease, backdrop-filter 160ms ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-panel, #FFFFFF)",
          border: "1px solid var(--line-1, #E8E3D8)",
          borderRadius: 14,
          padding: "24px 24px 20px",
          maxWidth: 400,
          width: "calc(100% - 48px)",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.06), 0 16px 40px -4px rgba(0,0,0,0.14)",
          transform: visible ? "scale(1) translateY(0)" : "scale(0.96) translateY(6px)",
          opacity: visible ? 1 : 0,
          transition: "transform 160ms cubic-bezier(0.16,1,0.3,1), opacity 160ms ease",
        }}
      >
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--ink-1, #1A1A1A)",
            lineHeight: 1.4,
          }}
        >
          {title}
        </p>
        {description && (
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 13.5,
              color: "var(--ink-3, #8A8A8A)",
              lineHeight: 1.55,
            }}
          >
            {description}
          </p>
        )}
        {!description && <div style={{ height: 16 }} />}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => dismiss(false)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--line-strong, #D9D3C4)",
              background: "var(--bg-panel, #FFFFFF)",
              color: "var(--ink-2, #4A4A4A)",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => dismiss(true)}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onMouseEnter={(e) => ((e.currentTarget as any).style.background = confirmHover)}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onMouseLeave={(e) => ((e.currentTarget as any).style.background = confirmBg)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: confirmBg,
              color: "#FFFFFF",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 120ms ease",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function appConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const cleanup = (result: boolean) => {
      setTimeout(() => {
        root.unmount();
        if (document.body.contains(container)) document.body.removeChild(container);
      }, 200);
      resolve(result);
    };

    root.render(
      <ConfirmUI {...options} onConfirm={() => cleanup(true)} onCancel={() => cleanup(false)} />,
    );
  });
}
