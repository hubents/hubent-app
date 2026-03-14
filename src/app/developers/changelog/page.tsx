"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { RiArrowLeftSLine } from "@remixicon/react";

const CHANGELOG = [
  {
    version: "2025-03-14",
    date: "2025-03-14",
    current: true,
    changes: [
      { type: "added" as const, text: "Forms: crm_create_contact and crm_create_lead boolean fields on form objects (GET, POST, PATCH)" },
      { type: "added" as const, text: "Forms: 10 new CRM field types for form builder (last_name, nie_cif, address, city, postal_code, state, country, trade_name, website, category)" },
      { type: "changed" as const, text: "Forms: PUT /forms/{id}/fields now requires form status to be 'draft'. Returns 422 for active/paused forms" },
      { type: "security" as const, text: "Forms: Server-side enforcement of draft-only field editing on both internal and V1 API routes" },
    ],
  },
  {
    version: "2025-01-01",
    date: "2025-01-01",
    current: false,
    changes: [
      { type: "added" as const, text: "Initial public API release with 40+ endpoints" },
      { type: "added" as const, text: "OpenAPI 3.1 specification with Scalar UI documentation" },
      { type: "added" as const, text: "API key authentication with 19 granular scopes" },
      { type: "added" as const, text: "Webhook system with 32+ event types and HMAC-SHA256 signing" },
      { type: "added" as const, text: "MCP server for AI assistant integration (Claude, GPT)" },
      { type: "added" as const, text: "Rate limiting with per-key configuration (60-10,000 req/min)" },
      { type: "added" as const, text: "Idempotency support via Idempotency-Key header (24h TTL)" },
      { type: "added" as const, text: "Cursor-based pagination (Stripe-style starting_after/ending_before)" },
      { type: "added" as const, text: "Provider-scoped API access with restricted scope set" },
      { type: "added" as const, text: "Feature flags per subscription plan (starter/standard/agency)" },
      { type: "added" as const, text: "Automatic API request logging and usage statistics" },
      { type: "added" as const, text: "API cleanup cron for expired idempotency keys and old logs" },
    ],
  },
];

const TYPE_STYLES = {
  added: { label: "Added", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  changed: { label: "Changed", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  deprecated: { label: "Deprecated", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  removed: { label: "Removed", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  fixed: { label: "Fixed", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  security: { label: "Security", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400" },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/developers" className="text-muted-foreground hover:text-foreground">
                <RiArrowLeftSLine className="h-5 w-5" />
              </Link>
              <Link href="/" className="flex items-center">
                <Logo variant="full" size="md" theme="light" />
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium">Changelog</span>
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/developers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</Link>
              <a href="/api/v1/openapi" target="_blank" className="text-sm text-muted-foreground hover:text-foreground transition-colors">OpenAPI</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3">API Changelog</h1>
          <p className="text-muted-foreground">
            Historial de cambios de la API pública de HubEnts. La API usa date-based versioning
            a través del header <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">X-HubEnts-Version</code>.
          </p>
        </div>

        <div className="mb-8 border rounded-lg p-4 bg-muted/30">
          <h3 className="font-medium text-sm mb-2">Sobre el versionado</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>• La API usa <strong>date-based versioning</strong> (ej: <code className="text-xs bg-muted px-1 rounded font-mono">2025-01-01</code>)</li>
            <li>• Cada request incluye el header <code className="text-xs bg-muted px-1 rounded font-mono">X-HubEnts-Version</code> con la version usada</li>
            <li>• Los cambios backwards-compatible se aplican sin cambio de version</li>
            <li>• Los breaking changes incrementan la version y se documentan aqui</li>
            <li>• Podés fijar la version de tu API key para evitar breaking changes automaticos</li>
          </ul>
        </div>

        <div className="space-y-12">
          {CHANGELOG.map((release) => (
            <div key={release.version} className="relative">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-semibold font-mono">v{release.version}</h2>
                <span className="text-sm text-muted-foreground">{release.date}</span>
                {release.current && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                    Current
                  </span>
                )}
              </div>
              <div className="space-y-2 ml-1 border-l-2 border-border pl-4">
                {release.changes.map((change, i) => {
                  const style = TYPE_STYLES[change.type];
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${style.color}`}>
                        {style.label}
                      </span>
                      <p className="text-sm">{change.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <p>© 2025 HubEnts — API v2025-01-01</p>
          <div className="flex gap-4">
            <Link href="/developers" className="hover:text-foreground">Docs</Link>
            <a href="/api/v1/openapi" target="_blank" className="hover:text-foreground">OpenAPI</a>
            <Link href="/auth/login" className="hover:text-foreground">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
