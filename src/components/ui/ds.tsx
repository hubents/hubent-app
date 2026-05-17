"use client";

/**
 * Design-system primitives — single source of truth for the prototype style.
 *
 * Rules:
 *  - Only inline styles + CSS variables (no Tailwind classes).
 *  - Every token comes from a CSS variable so themes can override them.
 *  - Keep it small: only patterns that appear 3+ times in the codebase.
 */

import React from "react";
import { getInitials, avColor } from "@/lib/ui-utils";

// ─── Tokens ──────────────────────────────────────────────────────────────────
export const R = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
} as const;

export const FSZ = {
  xs:   11,
  sm:   12,
  md:   13,
  lg:   15,
  xl:   17,
  h:    22,
} as const;

// ─── Btn ─────────────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "outline" | "ghost" | "danger";
type BtnSize    = "sm" | "md" | "lg";

const BTN_BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  borderRadius: R.sm,
  fontFamily: "inherit",
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity .15s, background .15s",
  border: "none",
  outline: "none",
  whiteSpace: "nowrap",
};

const BTN_SIZE: Record<BtnSize, React.CSSProperties> = {
  sm: { fontSize: FSZ.xs, padding: "5px 12px" },
  md: { fontSize: FSZ.md, padding: "8px 16px" },
  lg: { fontSize: FSZ.lg, padding: "10px 20px" },
};

const BTN_VARIANT: Record<BtnVariant, React.CSSProperties> = {
  primary: {
    background: "var(--color-primary)",
    color: "#FFFFFF",
    border: "1px solid var(--color-primary)",
  },
  outline: {
    background: "#FFFFFF",
    color: "var(--ink-1)",
    border: "1px solid var(--line-strong)",
  },
  ghost: {
    background: "transparent",
    color: "var(--ink-1)",
    border: "1px solid transparent",
  },
  danger: {
    background: "#FFFFFF",
    color: "#C0392B",
    border: "1px solid #F2CFCC",
  },
};

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
}

export function Btn({
  variant = "primary",
  size = "md",
  style,
  disabled,
  children,
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        ...BTN_BASE,
        ...BTN_SIZE[size],
        ...BTN_VARIANT[variant],
        ...(disabled ? { opacity: 0.45, cursor: "not-allowed" } : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── Inp ─────────────────────────────────────────────────────────────────────
interface InpProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Inp({ style, error, disabled, ...rest }: InpProps) {
  return (
    <input
      {...rest}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "9px 12px",
        border: `1px solid ${error ? "#E85D4E" : "var(--line-1)"}`,
        borderRadius: R.sm,
        fontSize: FSZ.md,
        fontFamily: "inherit",
        background: disabled ? "var(--bg-subtle)" : "#FFFFFF",
        color: disabled ? "var(--ink-3)" : "var(--ink-1)",
        outline: "none",
        boxSizing: "border-box",
        ...style,
      }}
    />
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
interface TaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Ta({ style, error, ...rest }: TaProps) {
  return (
    <textarea
      {...rest}
      style={{
        width: "100%",
        padding: "9px 12px",
        border: `1px solid ${error ? "#E85D4E" : "var(--line-1)"}`,
        borderRadius: R.sm,
        fontSize: FSZ.md,
        fontFamily: "inherit",
        background: "#FFFFFF",
        color: "var(--ink-1)",
        outline: "none",
        resize: "vertical",
        boxSizing: "border-box",
        ...style,
      }}
    />
  );
}

// ─── PCard ───────────────────────────────────────────────────────────────────
interface PCardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: number | string;
}

export function PCard({ style, padding = 18, children, ...rest }: PCardProps) {
  return (
    <div
      {...rest}
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--line-1)",
        borderRadius: R.md,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── FieldLabel ───────────────────────────────────────────────────────────────
interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  hint?: string;
}

export function FieldLabel({ hint, children, style, ...rest }: FieldLabelProps) {
  return (
    <label
      {...rest}
      style={{
        display: "block",
        fontSize: FSZ.xs,
        fontWeight: 600,
        color: "var(--ink-2)",
        marginBottom: 5,
        ...style,
      }}
    >
      {children}
      {hint && (
        <span style={{ fontWeight: 400, color: "var(--ink-3)", marginLeft: 5 }}>
          {hint}
        </span>
      )}
    </label>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────
export function SectionTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: FSZ.xs,
        fontWeight: 600,
        color: "var(--ink-3)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 8,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
      <div>
        <h1 style={{ fontSize: FSZ.h, fontWeight: 600, margin: "0 0 4px", color: "var(--ink-1)", letterSpacing: "-0.01em" }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: FSZ.md, color: "var(--ink-3)", margin: 0 }}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── Pill / badge ─────────────────────────────────────────────────────────────
interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string;
  bg?: string;
}

export function Pill({ color = "var(--ink-2)", bg = "var(--bg-subtle)", style, children, ...rest }: PillProps) {
  return (
    <span
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: FSZ.xs,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        color,
        background: bg,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

/**
 * Muestra la foto de perfil/logo si existe; si no, iniciales sobre color.
 * - src: URL de la imagen (user.image / org.logo)
 * - name: nombre para derivar iniciales y color
 * - seed: semilla alternativa para el color (por defecto usa name)
 * - size: diámetro en px (default 36)
 */
export function Av({
  src,
  name,
  seed,
  size = 36,
  style,
}: {
  src?: string | null;
  name?: string | null;
  seed?: string | number;
  size?: number;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    ...style,
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        style={{ ...base, objectFit: "cover", display: "block" }}
      />
    );
  }

  const initials = getInitials(name);
  const bg = avColor(seed ?? name ?? "?");
  return (
    <div
      style={{
        ...base,
        background: bg,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.38),
        fontWeight: 700,
        userSelect: "none",
      }}
    >
      {initials}
    </div>
  );
}

// ─── BtnIcon ─────────────────────────────────────────────────────────────────
// Square icon-only button (32 × 32). Use size="sm" for 26 × 26 (nav arrows).
interface BtnIconProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md";
}

export function BtnIcon({ size = "md", style, children, ...rest }: BtnIconProps) {
  const dim = size === "sm" ? 26 : 32;
  const radius = size === "sm" ? R.xs + 2 : R.sm;
  return (
    <button
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dim,
        height: dim,
        borderRadius: radius,
        border: "1px solid var(--line-1)",
        background: "var(--bg-app, #fff)",
        color: "var(--ink-2)",
        cursor: "pointer",
        flexShrink: 0,
        padding: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── Pill button style exports ────────────────────────────────────────────────
// Raw CSSProperties for components that render native <button> elements with
// inline styles (e.g. calendar toolbar). Import instead of redefining locally.
export const pillPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 13px",
  background: "var(--color-primary)",
  border: "none",
  borderRadius: 999,
  fontSize: FSZ.md,
  fontWeight: 600,
  color: "var(--color-primary-ink, #fff)",
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap" as const,
};

export const pillGhostStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  background: "var(--bg-subtle)",
  border: "1px solid var(--line-1)",
  borderRadius: 999,
  fontSize: FSZ.md,
  fontWeight: 500,
  color: "var(--ink-1)",
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap" as const,
};

export const smallToolbarBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 11px",
  border: "1px solid var(--line-strong)",
  borderRadius: R.sm,
  background: "var(--bg-app, #fff)",
  fontSize: 12.5,
  color: "var(--ink-1)",
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap" as const,
};

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ label, style }: { label?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--line-1)",
        marginTop: 16,
        paddingTop: 16,
        fontSize: FSZ.xs,
        fontWeight: 600,
        color: "var(--ink-3)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        ...style,
      }}
    >
      {label}
    </div>
  );
}
