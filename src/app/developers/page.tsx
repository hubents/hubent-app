"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { RiCodeSSlashLine, RiShieldKeyholeLine, RiWebhookLine, RiRobot2Line, RiSpeedLine, RiRepeatLine, RiLockLine, RiFileList3Line, RiTerminalLine, RiArrowRightSLine, RiExternalLinkLine, RiBrainLine, RiDatabase2Line, RiPlugLine } from "@remixicon/react";

const NAV_ITEMS = [
  { href: "#quick-start", label: "Quick Start" },
  { href: "#authentication", label: "Auth" },
  { href: "#endpoints", label: "Endpoints" },
  { href: "#webhooks", label: "Webhooks" },
  { href: "#mcp", label: "MCP" },
  { href: "#scopes", label: "Scopes" },
  { href: "#errors", label: "Errors" },
  { href: "#api-reference", label: "Reference" },
];

const ENDPOINTS = [
  { tag: "Organization", endpoints: [
    { method: "GET", path: "/me", desc: "Informacion de la organizacion actual" },
  ]},
  { tag: "Events", endpoints: [
    { method: "GET", path: "/events", desc: "Listar eventos (filtro por status, type, search)" },
    { method: "POST", path: "/events", desc: "Crear un evento" },
    { method: "GET", path: "/events/{id}", desc: "Obtener detalle de un evento" },
    { method: "PATCH", path: "/events/{id}", desc: "Actualizar un evento" },
    { method: "DELETE", path: "/events/{id}", desc: "Cancelar un evento" },
    { method: "GET", path: "/events/{id}/schedule", desc: "Listar agenda del evento" },
    { method: "POST", path: "/events/{id}/schedule", desc: "Agregar item a la agenda" },
  ]},
  { tag: "Guests", endpoints: [
    { method: "GET", path: "/events/{id}/guests", desc: "Listar invitados de un evento" },
    { method: "POST", path: "/events/{id}/guests", desc: "Agregar invitado" },
    { method: "PATCH", path: "/events/{id}/guests/{guestId}", desc: "Actualizar invitado" },
    { method: "DELETE", path: "/events/{id}/guests/{guestId}", desc: "Eliminar invitado" },
    { method: "GET", path: "/events/{id}/guests/stats", desc: "Estadisticas de RSVP y check-in" },
    { method: "POST", path: "/events/{id}/guests/{guestId}/checkin", desc: "Check-in de invitado" },
  ]},
  { tag: "Contacts", endpoints: [
    { method: "GET", path: "/contacts", desc: "Listar contactos (personas, empresas, vendors)" },
    { method: "POST", path: "/contacts", desc: "Crear contacto" },
    { method: "GET", path: "/contacts/{id}", desc: "Obtener contacto" },
    { method: "PATCH", path: "/contacts/{id}", desc: "Actualizar contacto" },
    { method: "DELETE", path: "/contacts/{id}", desc: "Eliminar contacto (soft delete)" },
  ]},
  { tag: "Tasks", endpoints: [
    { method: "GET", path: "/tasks", desc: "Listar tareas (filtro por status, event_id)" },
    { method: "POST", path: "/tasks", desc: "Crear tarea" },
    { method: "GET", path: "/tasks/{id}", desc: "Obtener tarea" },
    { method: "PATCH", path: "/tasks/{id}", desc: "Actualizar tarea" },
    { method: "DELETE", path: "/tasks/{id}", desc: "Cancelar tarea" },
  ]},
  { tag: "CRM", endpoints: [
    { method: "GET", path: "/crm/leads", desc: "Listar leads del pipeline" },
    { method: "POST", path: "/crm/leads", desc: "Crear lead" },
    { method: "GET", path: "/crm/leads/{id}", desc: "Obtener lead" },
    { method: "PATCH", path: "/crm/leads/{id}", desc: "Actualizar lead" },
    { method: "DELETE", path: "/crm/leads/{id}", desc: "Eliminar lead" },
    { method: "POST", path: "/crm/leads/{id}/move", desc: "Mover lead de etapa" },
    { method: "GET", path: "/crm/stages", desc: "Listar etapas del pipeline" },
    { method: "GET", path: "/crm/pipeline", desc: "Vista general del pipeline con conteo" },
  ]},
  { tag: "Finance", endpoints: [
    { method: "GET", path: "/finance/documents", desc: "Listar documentos (facturas, presupuestos)" },
    { method: "POST", path: "/finance/documents", desc: "Crear documento financiero" },
    { method: "GET", path: "/finance/documents/{id}", desc: "Obtener documento con items" },
    { method: "PATCH", path: "/finance/documents/{id}", desc: "Actualizar documento" },
    { method: "GET", path: "/finance/payments", desc: "Listar pagos" },
    { method: "POST", path: "/finance/payments", desc: "Registrar pago" },
    { method: "GET", path: "/finance/dashboard", desc: "Dashboard financiero (totales, pendientes)" },
    { method: "GET", path: "/finance/bank-accounts", desc: "Listar cuentas bancarias" },
    { method: "GET", path: "/finance/products", desc: "Catalogo de productos/servicios" },
  ]},
  { tag: "Forms", endpoints: [
    { method: "GET", path: "/forms", desc: "Listar formularios" },
    { method: "POST", path: "/forms", desc: "Crear formulario" },
    { method: "GET", path: "/forms/{id}", desc: "Obtener formulario" },
    { method: "PATCH", path: "/forms/{id}", desc: "Actualizar formulario" },
    { method: "GET", path: "/forms/{id}/fields", desc: "Listar campos del formulario" },
    { method: "PUT", path: "/forms/{id}/fields", desc: "Reemplazar campos" },
    { method: "GET", path: "/forms/{id}/submissions", desc: "Listar respuestas" },
  ]},
  { tag: "Vendors", endpoints: [
    { method: "GET", path: "/vendors", desc: "Listar proveedores" },
    { method: "POST", path: "/vendors", desc: "Crear proveedor" },
    { method: "GET", path: "/vendors/{id}", desc: "Obtener proveedor" },
    { method: "PATCH", path: "/vendors/{id}", desc: "Actualizar proveedor" },
    { method: "DELETE", path: "/vendors/{id}", desc: "Eliminar proveedor" },
  ]},
  { tag: "Webhooks", endpoints: [
    { method: "GET", path: "/webhooks", desc: "Listar webhooks configurados" },
    { method: "POST", path: "/webhooks", desc: "Crear webhook" },
    { method: "GET", path: "/webhooks/{id}", desc: "Obtener webhook con stats de delivery" },
    { method: "PATCH", path: "/webhooks/{id}", desc: "Actualizar webhook" },
    { method: "DELETE", path: "/webhooks/{id}", desc: "Eliminar webhook" },
    { method: "POST", path: "/webhooks/{id}/rotate-secret", desc: "Rotar signing secret" },
  ]},
  { tag: "MCP", endpoints: [
    { method: "GET", path: "/mcp", desc: "Server manifest (tools + resources)" },
    { method: "POST", path: "/mcp/execute", desc: "Ejecutar tool MCP" },
    { method: "GET", path: "/mcp/resources", desc: "Obtener resource MCP por URI" },
  ]},
  { tag: "System", endpoints: [
    { method: "GET", path: "/health", desc: "Health check (no auth)" },
    { method: "GET", path: "/openapi", desc: "OpenAPI 3.1 specification" },
    { method: "GET", path: "/api-keys", desc: "Listar API keys de la organizacion" },
    { method: "GET", path: "/templates", desc: "Listar templates de eventos" },
  ]},
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PATCH: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PUT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const SCOPES = [
  { scope: "events:read", desc: "Listar y ver eventos, agenda" },
  { scope: "events:write", desc: "Crear, actualizar, cancelar eventos" },
  { scope: "contacts:read", desc: "Listar y ver contactos" },
  { scope: "contacts:write", desc: "Crear, actualizar, eliminar contactos" },
  { scope: "tasks:read", desc: "Listar y ver tareas" },
  { scope: "tasks:write", desc: "Crear, actualizar, cancelar tareas" },
  { scope: "guests:read", desc: "Listar invitados y estadisticas" },
  { scope: "guests:write", desc: "Agregar, actualizar, eliminar invitados, check-in" },
  { scope: "crm:read", desc: "Listar leads, pipeline, etapas" },
  { scope: "crm:write", desc: "Crear, actualizar, mover, eliminar leads" },
  { scope: "finance:read", desc: "Listar documentos, pagos, dashboard" },
  { scope: "finance:write", desc: "Crear documentos y registrar pagos" },
  { scope: "forms:read", desc: "Listar formularios, campos, respuestas" },
  { scope: "forms:write", desc: "Crear y editar formularios y campos" },
  { scope: "vendors:read", desc: "Listar y ver proveedores" },
  { scope: "vendors:write", desc: "Crear, actualizar, eliminar proveedores" },
  { scope: "templates:read", desc: "Listar templates de eventos" },
  { scope: "organization:read", desc: "Ver info de la organizacion (/me)" },
  { scope: "webhooks:manage", desc: "CRUD de webhooks y rotar secrets" },
];

const MCP_TOOLS = [
  { cat: "Eventos", tools: ["hubents_list_events", "hubents_get_event", "hubents_create_event", "hubents_update_event"] },
  { cat: "Contactos", tools: ["hubents_list_contacts", "hubents_create_contact"] },
  { cat: "Tareas", tools: ["hubents_list_tasks", "hubents_create_task", "hubents_update_task"] },
  { cat: "Invitados", tools: ["hubents_list_guests", "hubents_add_guest", "hubents_get_guest_stats"] },
  { cat: "CRM", tools: ["hubents_list_leads", "hubents_create_lead", "hubents_get_pipeline"] },
  { cat: "Finanzas", tools: ["hubents_list_documents", "hubents_get_finance_dashboard"] },
  { cat: "Formularios", tools: ["hubents_list_forms"] },
  { cat: "Organizacion", tools: ["hubents_get_me"] },
];

const WEBHOOK_EVENTS = [
  "event.created", "event.updated", "event.deleted", "event.status_changed",
  "contact.created", "contact.updated", "contact.deleted",
  "guest.created", "guest.updated", "guest.deleted", "guest.checked_in", "guest.rsvp_responded",
  "task.created", "task.updated", "task.completed", "task.deleted",
  "lead.created", "lead.updated", "lead.stage_changed", "lead.won", "lead.lost", "lead.deleted",
  "finance.document_created", "finance.document_updated", "finance.document_status_changed",
  "finance.payment_received", "finance.payment_created",
  "form.submission_created", "form.updated",
  "vendor.created", "vendor.updated", "vendor.deleted",
];

export default function DeveloperPortalPage() {
  const [expandedTags, setExpandedTags] = useState<string[]>(["Events"]);

  const toggleTag = (tag: string) => {
    setExpandedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center">
                <Logo variant="full" size="md" theme="light" />
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium">Developer Portal</span>
            </div>
            <nav className="hidden md:flex items-center gap-5">
              {NAV_ITEMS.map((item) => (
                <a key={item.href} href={item.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {item.label}
                </a>
              ))}
              <Link href="/developers/changelog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Changelog</Link>
              <Link href="/auth/login" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full mb-4">
            <RiCodeSSlashLine className="h-4 w-4" />
            <span>REST API v2025-01-01 · OpenAPI 3.1</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">HubEnts Public API</h1>
          <p className="text-lg text-muted-foreground mb-8">
            API RESTful completa para gestionar eventos, contactos, invitados, tareas, CRM, finanzas y formularios.
            Compatible con CLI, MCP (AI assistants), webhooks y mas.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/settings/developers" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              <RiShieldKeyholeLine className="h-4 w-4" />
              Obtener API Key
            </Link>
            <a href="#api-reference" className="inline-flex items-center gap-2 border px-5 py-2.5 rounded-lg font-medium hover:bg-muted/50 transition-colors">
              <RiFileList3Line className="h-4 w-4" />
              API Reference
            </a>
            <a href="/api/v1/openapi" target="_blank" className="inline-flex items-center gap-2 border px-5 py-2.5 rounded-lg font-medium hover:bg-muted/50 transition-colors">
              <RiExternalLinkLine className="h-4 w-4" />
              OpenAPI Spec
            </a>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <code className="text-sm bg-muted px-3 py-1.5 rounded-md font-mono">Base URL: https://app.hubents.com/api/v1</code>
            <code className="text-sm bg-muted px-3 py-1.5 rounded-md font-mono">40+ endpoints</code>
            <code className="text-sm bg-muted px-3 py-1.5 rounded-md font-mono">19 scopes</code>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quick-start" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-6">Quick Start</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">1</div>
              <h3 className="font-medium">Obtene tu API Key</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Anda a <strong>Settings &gt; Developers</strong> en tu dashboard y crea una nueva API key con los scopes que necesites.
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">2</div>
              <h3 className="font-medium">Autenticate</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Usa el header <code className="text-xs bg-muted px-1 rounded">Authorization: Bearer hb_live_...</code> en cada request.
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">3</div>
              <h3 className="font-medium">Hace tu primer request</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Proba con <code className="text-xs bg-muted px-1 rounded">GET /api/v1/me</code> para verificar tu conexion.
            </p>
          </div>
        </div>
        <div className="bg-zinc-950 rounded-lg p-5 text-sm font-mono text-zinc-200 overflow-x-auto">
          <p className="text-zinc-500 mb-2"># Tu primer request</p>
          <p><span className="text-emerald-400">curl</span> https://app.hubents.com/api/v1/me \</p>
          <p className="pl-4">-H <span className="text-amber-300">&quot;Authorization: Bearer hb_live_abc123...&quot;</span> \</p>
          <p className="pl-4">-H <span className="text-amber-300">&quot;X-HubEnts-Version: 2025-01-01&quot;</span></p>
          <p className="mt-3 text-zinc-500"># Respuesta</p>
          <p>{`{`}</p>
          <p className="pl-4"><span className="text-blue-300">&quot;object&quot;</span>: <span className="text-amber-300">&quot;organization&quot;</span>,</p>
          <p className="pl-4"><span className="text-blue-300">&quot;id&quot;</span>: <span className="text-emerald-300">1</span>,</p>
          <p className="pl-4"><span className="text-blue-300">&quot;name&quot;</span>: <span className="text-amber-300">&quot;Mi Empresa de Eventos&quot;</span>,</p>
          <p className="pl-4"><span className="text-blue-300">&quot;plan&quot;</span>: <span className="text-amber-300">&quot;standard&quot;</span></p>
          <p>{`}`}</p>
        </div>
      </section>

      {/* Authentication */}
      <section id="authentication" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <RiShieldKeyholeLine className="h-6 w-6 text-primary" /> Authentication
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-muted-foreground mb-4">
              La API usa Bearer token authentication. Tu API key actua como el token.
              Cada key tiene un prefijo que indica su entorno.
            </p>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <span className="font-mono text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded shrink-0">hb_live_</span>
                <div>
                  <p className="font-medium">Produccion</p>
                  <p className="text-muted-foreground text-xs">Acceso real a datos de tu organizacion</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <span className="font-mono text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded shrink-0">hb_test_</span>
                <div>
                  <p className="font-medium">Testing</p>
                  <p className="text-muted-foreground text-xs">Sandbox aislado para desarrollo</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
              <strong>Importante:</strong> La API key se muestra una sola vez al crearla. Guardala de forma segura. Si la perdes, deberás crear una nueva.
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Headers requeridos en cada request</p>
            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Header</th>
                    <th className="text-left px-4 py-2 font-medium">Valor</th>
                    <th className="text-left px-4 py-2 font-medium">Requerido</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t"><td className="px-4 py-2 font-mono text-xs">Authorization</td><td className="px-4 py-2 text-xs">Bearer hb_live_...</td><td className="px-4 py-2 text-xs">Si</td></tr>
                  <tr className="border-t"><td className="px-4 py-2 font-mono text-xs">Content-Type</td><td className="px-4 py-2 text-xs">application/json</td><td className="px-4 py-2 text-xs">POST/PATCH</td></tr>
                  <tr className="border-t"><td className="px-4 py-2 font-mono text-xs">X-HubEnts-Version</td><td className="px-4 py-2 text-xs">2025-01-01</td><td className="px-4 py-2 text-xs">No</td></tr>
                  <tr className="border-t"><td className="px-4 py-2 font-mono text-xs">Idempotency-Key</td><td className="px-4 py-2 text-xs">UUID unico</td><td className="px-4 py-2 text-xs">Recomendado POST</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-6">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: RiRepeatLine, title: "Cursor Pagination", desc: "Paginacion eficiente estilo Stripe con starting_after/ending_before" },
            { icon: RiLockLine, title: "Idempotency", desc: "Header Idempotency-Key para requests POST seguros (24h TTL)" },
            { icon: RiSpeedLine, title: "Rate Limiting", desc: "100 req/min default, configurable hasta 10,000/min" },
            { icon: RiWebhookLine, title: "Webhooks", desc: "32 event types con HMAC-SHA256 signing y retries" },
            { icon: RiCodeSSlashLine, title: "snake_case", desc: "Todas las respuestas en snake_case para consistencia" },
            { icon: RiShieldKeyholeLine, title: "19 Scopes", desc: "Control granular de permisos por API key" },
            { icon: RiRobot2Line, title: "MCP Server", desc: "18 tools para AI assistants (Claude, GPT)" },
            { icon: RiFileList3Line, title: "OpenAPI 3.1", desc: "Spec completa + documentacion interactiva" },
          ].map((f) => (
            <div key={f.title} className="border rounded-lg p-4 hover:border-primary/30 transition-colors">
              <f.icon className="h-5 w-5 text-primary mb-2" />
              <h3 className="font-medium text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Endpoints Overview */}
      <section id="endpoints" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
          <RiTerminalLine className="h-6 w-6 text-primary" /> Endpoints
        </h2>
        <p className="text-muted-foreground mb-6">
          Todos los endpoints usan el prefijo <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">/api/v1</code>. Respuestas paginadas incluyen <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">has_more</code> y <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">total_count</code>.
        </p>
        <div className="space-y-2">
          {ENDPOINTS.map((group) => (
            <div key={group.tag} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleTag(group.tag)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{group.tag}</span>
                  <span className="text-xs text-muted-foreground">{group.endpoints.length} endpoints</span>
                </div>
                <RiArrowRightSLine className={`h-4 w-4 text-muted-foreground transition-transform ${expandedTags.includes(group.tag) ? "rotate-90" : ""}`} />
              </button>
              {expandedTags.includes(group.tag) && (
                <div className="border-t">
                  {group.endpoints.map((ep, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2 text-sm border-b last:border-b-0 hover:bg-muted/20">
                      <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded w-14 text-center shrink-0 ${METHOD_COLORS[ep.method]}`}>
                        {ep.method}
                      </span>
                      <code className="font-mono text-xs shrink-0">{ep.path}</code>
                      <span className="text-xs text-muted-foreground truncate">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Total: <strong>{ENDPOINTS.reduce((acc, g) => acc + g.endpoints.length, 0)} endpoints</strong> en {ENDPOINTS.length} grupos.
          Ver la <a href="#api-reference" className="text-primary hover:underline">API Reference</a> para schemas completos y ejemplos.
        </p>
      </section>

      {/* Webhooks */}
      <section id="webhooks" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <RiWebhookLine className="h-6 w-6 text-primary" /> Webhooks
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-muted-foreground mb-4">
              Recibí notificaciones en tiempo real cuando algo cambia en tu cuenta. Configura endpoints
              HTTPS y suscribite a los eventos que necesites.
            </p>
            <div className="space-y-4 text-sm">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-1">Signing & Verificacion</h4>
                <p className="text-muted-foreground text-xs">
                  Cada delivery incluye <code className="bg-muted px-1 rounded">X-HubEnts-Signature</code> — HMAC-SHA256 del body con tu webhook secret.
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-1">Retries automaticos</h4>
                <p className="text-muted-foreground text-xs">
                  Status &gt;= 400 o timeout (&gt;10s) → 3 retries con backoff exponencial (1min, 5min, 30min).
                </p>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-medium text-sm mb-2">{WEBHOOK_EVENTS.length} Event Types</h4>
              <div className="flex flex-wrap gap-1">
                {WEBHOOK_EVENTS.map((e) => (
                  <code key={e} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{e}</code>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-zinc-950 rounded-lg p-4">
              <p className="text-xs text-zinc-500 mb-2">Verificar signature (Node.js)</p>
              <pre className="text-xs font-mono text-zinc-200 overflow-x-auto"><code>{`const crypto = require("crypto");

function verifyWebhook(body, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</code></pre>
            </div>
            <div className="bg-zinc-950 rounded-lg p-4">
              <p className="text-xs text-zinc-500 mb-2">Payload ejemplo</p>
              <pre className="text-xs font-mono text-zinc-200 overflow-x-auto"><code>{`{
  "id": "evt_abc123",
  "type": "event.created",
  "created_at": "2025-01-15T10:30:00Z",
  "data": {
    "id": 42,
    "name": "Boda García",
    "status": "confirmed"
  }
}`}</code></pre>
            </div>
          </div>
        </div>
      </section>

      {/* MCP Section */}
      <section id="mcp" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
          <RiRobot2Line className="h-6 w-6 text-primary" /> MCP — AI Integration
        </h2>
        <p className="text-muted-foreground mb-6">
          El <strong>Model Context Protocol (MCP)</strong> permite que AI assistants como Claude, ChatGPT u otros agentes
          operen HubEnts directamente. Tu AI assistant puede crear eventos, gestionar invitados, consultar finanzas y mas.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2"><RiBrainLine className="h-4 w-4" /> 18 Tools disponibles</h3>
            <div className="space-y-3">
              {MCP_TOOLS.map((group) => (
                <div key={group.cat} className="border rounded-lg p-3">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">{group.cat}</h4>
                  <div className="flex flex-wrap gap-1">
                    {group.tools.map((t) => (
                      <code key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{t}</code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <h3 className="font-medium mt-6 mb-3 flex items-center gap-2"><RiDatabase2Line className="h-4 w-4" /> 3 Resources</h3>
            <div className="space-y-2">
              {[
                { uri: "hubents://openapi-spec", name: "OpenAPI Spec completa" },
                { uri: "hubents://webhook-events", name: "Lista de webhook event types" },
                { uri: "hubents://api-scopes", name: "Lista de API scopes" },
              ].map((r) => (
                <div key={r.uri} className="flex items-center gap-3 text-sm border rounded-lg p-2">
                  <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">{r.uri}</code>
                  <span className="text-xs text-muted-foreground">{r.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-zinc-950 rounded-lg p-4">
              <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1"><RiPlugLine className="h-3 w-3" /> Configuracion Claude Desktop (claude_desktop_config.json)</p>
              <pre className="text-xs font-mono text-zinc-200 overflow-x-auto"><code>{`{
  "mcpServers": {
    "hubents": {
      "url": "https://app.hubents.com/api/v1/mcp",
      "headers": {
        "Authorization": "Bearer hb_live_..."
      }
    }
  }
}`}</code></pre>
            </div>
            <div className="bg-zinc-950 rounded-lg p-4">
              <p className="text-xs text-zinc-500 mb-2">Ejecutar tool via API</p>
              <pre className="text-xs font-mono text-zinc-200 overflow-x-auto"><code>{`curl -X POST https://app.hubents.com/api/v1/mcp/execute \\
  -H "Authorization: Bearer hb_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "tool": "hubents_create_event",
    "params": {
      "name": "Boda García-López",
      "type": "wedding",
      "date": "2025-06-15T18:00:00Z",
      "guest_count": 200
    }
  }'`}</code></pre>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300">
              <strong>Requiere plan Standard o superior.</strong> Habilitado via feature flag <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">mcp_server</code>.
            </div>
          </div>
        </div>
      </section>

      {/* Scopes & Permissions */}
      <section id="scopes" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
          <RiShieldKeyholeLine className="h-6 w-6 text-primary" /> Scopes & Permissions
        </h2>
        <p className="text-muted-foreground mb-6">
          Cada API key tiene scopes que determinan a qué recursos puede acceder. Asigna solo los scopes necesarios.
        </p>
        <div className="border rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Scope</th>
                <th className="text-left px-4 py-2 font-medium">Descripcion</th>
                <th className="text-left px-4 py-2 font-medium">Provider</th>
              </tr>
            </thead>
            <tbody>
              {SCOPES.map((s) => {
                const providerAllowed = ["events:read", "tasks:read", "tasks:write", "finance:read", "finance:write", "forms:read", "organization:read"].includes(s.scope);
                return (
                  <tr key={s.scope} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{s.scope}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{s.desc}</td>
                    <td className="px-4 py-2 text-xs">{providerAllowed ? "✓" : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          <strong>Provider:</strong> Las cuentas de proveedor solo pueden usar 7 de 19 scopes (marcados con ✓). Intentar usar un scope no permitido retorna <code className="bg-muted px-1 rounded">403 scope_not_allowed_for_provider</code>.
        </p>
      </section>

      {/* Rate Limiting */}
      <section id="rate-limiting" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <RiSpeedLine className="h-6 w-6 text-primary" /> Rate Limiting
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-muted-foreground mb-4">
              Cada API key tiene un rate limit por defecto. Plans superiores permiten limites custom por key.
            </p>
            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Plan</th>
                    <th className="text-left px-4 py-2 font-medium">Default</th>
                    <th className="text-left px-4 py-2 font-medium">Max Keys</th>
                    <th className="text-left px-4 py-2 font-medium">Custom Limit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t"><td className="px-4 py-2 text-xs">Starter</td><td className="px-4 py-2 text-xs">100/min</td><td className="px-4 py-2 text-xs">2</td><td className="px-4 py-2 text-xs">—</td></tr>
                  <tr className="border-t"><td className="px-4 py-2 text-xs">Standard</td><td className="px-4 py-2 text-xs">200/min</td><td className="px-4 py-2 text-xs">5</td><td className="px-4 py-2 text-xs">—</td></tr>
                  <tr className="border-t"><td className="px-4 py-2 text-xs">Agency</td><td className="px-4 py-2 text-xs">500/min</td><td className="px-4 py-2 text-xs">20</td><td className="px-4 py-2 text-xs">Hasta 10,000/min</td></tr>
                </tbody>
              </table>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Response Header</th>
                    <th className="text-left px-4 py-2 font-medium">Descripcion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t"><td className="px-4 py-2 font-mono text-xs">X-RateLimit-Limit</td><td className="px-4 py-2 text-xs text-muted-foreground">Max requests por ventana</td></tr>
                  <tr className="border-t"><td className="px-4 py-2 font-mono text-xs">X-RateLimit-Remaining</td><td className="px-4 py-2 text-xs text-muted-foreground">Requests restantes</td></tr>
                  <tr className="border-t"><td className="px-4 py-2 font-mono text-xs">X-RateLimit-Reset</td><td className="px-4 py-2 text-xs text-muted-foreground">Timestamp de reset (epoch)</td></tr>
                  <tr className="border-t"><td className="px-4 py-2 font-mono text-xs">Retry-After</td><td className="px-4 py-2 text-xs text-muted-foreground">Segundos para reintentar (solo 429)</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-zinc-950 rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-2">Respuesta 429 (Too Many Requests)</p>
            <pre className="text-xs font-mono text-zinc-200 overflow-x-auto"><code>{`HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705312800
Retry-After: 42

{
  "error": {
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Retry after 42 seconds.",
    "request_id": "req_abc123"
  }
}`}</code></pre>
          </div>
        </div>
      </section>

      {/* Errors */}
      <section id="errors" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-6">Errors</h2>
        <p className="text-muted-foreground mb-6">
          La API usa codigos HTTP convencionales. Todos los errores siguen la misma estructura con type, code, message y request_id.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">HTTP</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-left px-4 py-2 font-medium">Descripcion</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "400", type: "invalid_request_error", desc: "Parametros invalidos o faltantes" },
                  { code: "401", type: "authentication_error", desc: "API key invalida o faltante" },
                  { code: "403", type: "authorization_error", desc: "Scope insuficiente o feature no habilitado" },
                  { code: "404", type: "not_found_error", desc: "Recurso no encontrado" },
                  { code: "409", type: "conflict_error", desc: "Conflicto (idempotency key duplicada)" },
                  { code: "422", type: "validation_error", desc: "Error de validacion en el body" },
                  { code: "429", type: "rate_limit_error", desc: "Rate limit excedido" },
                  { code: "500", type: "internal_error", desc: "Error interno del servidor" },
                ].map((e) => (
                  <tr key={e.code} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs font-bold">{e.code}</td>
                    <td className="px-4 py-2 font-mono text-[10px]">{e.type}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-zinc-950 rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-2">Estructura de error</p>
            <pre className="text-xs font-mono text-zinc-200 overflow-x-auto"><code>{`{
  "error": {
    "type": "authentication_error",
    "code": "invalid_api_key",
    "message": "The API key provided is invalid.",
    "param": null,
    "request_id": "req_abc123"
  }
}`}</code></pre>
            <p className="text-xs text-zinc-500 mt-4 mb-1">Cada respuesta incluye:</p>
            <ul className="text-xs text-zinc-400 space-y-1 ml-4 list-disc">
              <li><code className="text-zinc-300">X-Request-Id</code> — ID unico para soporte</li>
              <li><code className="text-zinc-300">X-HubEnts-Version</code> — Version de la API</li>
              <li>Headers de rate limit en toda respuesta</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Scalar API Reference */}
      <section id="api-reference" className="border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            <RiFileList3Line className="h-6 w-6 text-primary" /> API Reference
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Documentacion interactiva generada automaticamente desde la OpenAPI 3.1 spec. Proba requests directamente desde el navegador.
          </p>
        </div>
        <iframe
          src="/api-docs.html"
          className="w-full border-0"
          style={{ height: "80vh", minHeight: "600px" }}
          title="HubEnts API Reference"
          loading="lazy"
        />
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <p>© 2025 HubEnts — API v2025-01-01</p>
          <div className="flex gap-4">
            <a href="/api/v1/openapi" target="_blank" className="hover:text-foreground">OpenAPI</a>
            <Link href="/developers/changelog" className="hover:text-foreground">Changelog</Link>
            <Link href="/auth/login" className="hover:text-foreground">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
