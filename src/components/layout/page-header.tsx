"use client";

import React from "react";
import Link from "next/link";
import { hgIcon } from "@/components/ui/hg-icon";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

const ArrowLeftIcon = hgIcon(ArrowLeft01Icon);

interface PageHeaderProps {
  /** Button / actions shown on the right side */
  action?: React.ReactNode;
  /** Render a back arrow on the left. Pass href for <Link> or onClick for programmatic nav */
  back?: { href?: string; onClick?: () => void; label?: string };
}

/**
 * Shared top-of-page action bar.
 * Replaces the repeated pattern: flex justify-between + empty <div> + action button.
 *
 * Usage:
 *   <PageHeader action={<Btn onClick={openDrawer}>+ New</Btn>} />
 *   <PageHeader back={{ onClick: () => router.back() }} action={<Btn>Save</Btn>} />
 */
export function PageHeader({ action, back }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        minHeight: 36,
      }}
    >
      {/* Left — optional back button */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {back && (
          back.href ? (
            <Link
              href={back.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 6,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--ink-2)",
                textDecoration: "none",
              }}
              title={back.label ?? "Volver"}
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
          ) : (
            <button
              onClick={back.onClick}
              title={back.label ?? "Volver"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 6,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--ink-2)",
              }}
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          )
        )}
      </div>

      {/* Right — action slot */}
      {action && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{action}</div>}
    </div>
  );
}
