"use client";

import { hgIcon } from "@/components/ui/hg-icon";
import { ShoppingBag01Icon } from "@hugeicons/core-free-icons";

const IcoProducts = hgIcon(ShoppingBag01Icon);

export default function ProductsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-[12px] mb-4"
        style={{ background: "var(--bg-subtle)" }}
      >
        <IcoProducts className="h-7 w-7 text-[var(--ink-2)]" />
      </div>
      <h1
        className="text-[22px] font-semibold text-[var(--ink-1)] mb-2"
        style={{ letterSpacing: "-0.015em" }}
      >
        Productos
      </h1>
      <p className="text-[14px] text-[var(--ink-3)] max-w-md">
        Catálogo de productos y servicios. Próximamente vas a poder gestionar
        tu inventario, precios y stock desde aquí.
      </p>
      <span
        className="inline-block mt-4 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
        style={{
          background: "var(--bg-subtle)",
          border: "1px solid var(--line-strong)",
          color: "var(--ink-2)",
        }}
      >
        Próximamente
      </span>
    </div>
  );
}
