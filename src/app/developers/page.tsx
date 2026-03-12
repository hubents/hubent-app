"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function DeveloperPortalPage() {
  const scalarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Scalar API Reference dynamically
    const script = document.createElement("script");
    script.id = "scalar-script";
    script.src = "https://cdn.jsdelivr.net/npm/@scalar/api-reference";
    script.onload = () => {
      if (scalarRef.current && !scalarRef.current.hasChildNodes()) {
        const el = document.createElement("api-reference");
        el.setAttribute("data-url", "/api/v1/openapi");
        el.setAttribute("data-theme", "kepler");
        el.setAttribute("data-layout", "modern");
        el.setAttribute("data-show-sidebar", "true");
        el.setAttribute("data-hide-download-button", "false");
        el.setAttribute("data-default-open-all-tags", "false");
        scalarRef.current.appendChild(el);
      }
    };
    if (!document.getElementById("scalar-script")) {
      document.head.appendChild(script);
    } else {
      // Script already loaded, trigger manually
      script.onload?.(new Event("load"));
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="font-bold text-xl">HubEnts</Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium">Developer Portal</span>
            </div>
            <nav className="flex items-center gap-6">
              <a href="#quick-start" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Quick Start</a>
              <a href="#authentication" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Auth</a>
              <a href="#webhooks" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Webhooks</a>
              <a href="#errors" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Errors</a>
              <a href="/api/v1/openapi" target="_blank" className="text-sm text-muted-foreground hover:text-foreground transition-colors">OpenAPI</a>
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
          <h1 className="text-4xl font-bold tracking-tight mb-4">HubEnts Public API</h1>
          <p className="text-lg text-muted-foreground mb-8">
            API RESTful completa para gestionar eventos, contactos, invitados, tareas, CRM, finanzas y formularios.
            Compatible con CLI, MCP (AI assistants), webhooks y mas.
          </p>
          <div className="flex flex-wrap gap-3">
            <code className="text-sm bg-muted px-3 py-1.5 rounded-md font-mono">Base URL: /api/v1</code>
            <code className="text-sm bg-muted px-3 py-1.5 rounded-md font-mono">Version: 2025-01-01</code>
            <code className="text-sm bg-muted px-3 py-1.5 rounded-md font-mono">OpenAPI 3.1</code>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quick-start" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-6">Quick Start</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border rounded-lg p-6">
            <div className="text-2xl font-bold text-primary mb-2">1</div>
            <h3 className="font-medium mb-2">Obtene tu API Key</h3>
            <p className="text-sm text-muted-foreground">
              Anda a <strong>Settings &gt; Developers</strong> en tu dashboard y crea una nueva API key con los scopes que necesites.
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <div className="text-2xl font-bold text-primary mb-2">2</div>
            <h3 className="font-medium mb-2">Autenticate</h3>
            <p className="text-sm text-muted-foreground">
              Usa el header <code className="text-xs bg-muted px-1 rounded">Authorization: Bearer hb_live_...</code> en cada request.
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <div className="text-2xl font-bold text-primary mb-2">3</div>
            <h3 className="font-medium mb-2">Hace tu primer request</h3>
            <p className="text-sm text-muted-foreground">
              Proba con <code className="text-xs bg-muted px-1 rounded">GET /api/v1/me</code> para verificar tu conexion.
            </p>
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section id="authentication" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-6">Authentication</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-muted-foreground mb-4">
              La API usa Bearer token authentication. Tu API key actua como el token.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">hb_live_</span>
                <span className="text-muted-foreground">Keys de produccion — acceso real a datos</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded">hb_test_</span>
                <span className="text-muted-foreground">Keys de testing — sandbox aislado</span>
              </div>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">Example request</p>
            <pre className="text-sm font-mono overflow-x-auto"><code>{`curl https://app.hubents.com/api/v1/me \\
  -H "Authorization: Bearer hb_live_abc123..." \\
  -H "X-HubEnts-Version: 2025-01-01"`}</code></pre>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-6">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Cursor Pagination", desc: "Paginacion eficiente estilo Stripe con starting_after/ending_before" },
            { title: "Idempotency", desc: "Header Idempotency-Key para requests POST seguros (24h TTL)" },
            { title: "Rate Limiting", desc: "100 req/min por default, configurable por API key" },
            { title: "Webhooks", desc: "32+ event types con HMAC-SHA256 signing y retries automaticos" },
            { title: "snake_case", desc: "Todas las respuestas en snake_case para consistencia" },
            { title: "Scoped Access", desc: "19 scopes granulares para control fino de permisos" },
            { title: "MCP Support", desc: "Servidor MCP para integracion con AI assistants (Claude, GPT)" },
            { title: "OpenAPI 3.1", desc: "Spec completa con schemas, ejemplos y Scalar UI" },
          ].map((f) => (
            <div key={f.title} className="border rounded-lg p-4">
              <h3 className="font-medium text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Webhooks */}
      <section id="webhooks" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-6">Webhooks</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-muted-foreground mb-4">
              Recibí notificaciones en tiempo real cuando algo cambia en tu cuenta. Configura endpoints
              HTTPS y suscribite a los eventos que necesites.
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium mb-2">Signing & Verificacion</h4>
                <p className="text-muted-foreground text-xs mb-2">
                  Cada delivery incluye un header <code className="text-xs bg-muted px-1 rounded">X-HubEnts-Signature</code> con
                  un HMAC-SHA256 del body usando tu webhook secret.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Retries</h4>
                <p className="text-muted-foreground text-xs">
                  Si tu endpoint responde con un status &gt;= 400 o timeout (&gt;10s), reintentamos hasta 3 veces
                  con backoff exponencial (1min, 5min, 30min).
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Event Types ({`32+`})</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {["event.created", "event.updated", "contact.created", "task.completed", "lead.stage_changed", "finance.payment_created", "form.submission_created", "vendor.created"].map((e) => (
                    <code key={e} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{e}</code>
                  ))}
                  <span className="text-[10px] text-muted-foreground">...y 24 mas</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="text-xs text-muted-foreground mb-1">Verificar signature (Node.js)</p>
            <pre className="text-xs font-mono overflow-x-auto"><code>{`const crypto = require("crypto");

function verifyWebhook(body, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// En tu handler:
const sig = req.headers["x-hubents-signature"];
const isValid = verifyWebhook(
  JSON.stringify(req.body), sig, "whsec_..."
);`}</code></pre>
            <p className="text-xs text-muted-foreground mt-3 mb-1">Payload ejemplo</p>
            <pre className="text-xs font-mono overflow-x-auto"><code>{`{
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
      </section>

      {/* Rate Limiting */}
      <section id="rate-limiting" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-6">Rate Limiting</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-muted-foreground mb-4">
              Cada API key tiene un rate limit por defecto de 100 requests/minuto.
              Plans superiores pueden configurar limites mas altos por key.
            </p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Header</th>
                    <th className="text-left px-4 py-2 font-medium">Descripcion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">X-RateLimit-Limit</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">Max requests por ventana</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">X-RateLimit-Remaining</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">Requests restantes</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">X-RateLimit-Reset</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">Timestamp de reset (epoch)</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">Retry-After</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">Segundos hasta poder reintentar (solo en 429)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Plan</th>
                    <th className="text-left px-4 py-2 font-medium">Default</th>
                    <th className="text-left px-4 py-2 font-medium">Max Custom</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t"><td className="px-4 py-2 text-xs">Starter</td><td className="px-4 py-2 text-xs">60/min</td><td className="px-4 py-2 text-xs">—</td></tr>
                  <tr className="border-t"><td className="px-4 py-2 text-xs">Standard</td><td className="px-4 py-2 text-xs">100/min</td><td className="px-4 py-2 text-xs">—</td></tr>
                  <tr className="border-t"><td className="px-4 py-2 text-xs">Agency</td><td className="px-4 py-2 text-xs">200/min</td><td className="px-4 py-2 text-xs">10,000/min</td></tr>
                </tbody>
              </table>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Respuesta 429 (Too Many Requests)</p>
              <pre className="text-xs font-mono overflow-x-auto"><code>{`{
  "error": {
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Retry after 42 seconds.",
    "request_id": "req_abc123"
  }
}`}</code></pre>
            </div>
          </div>
        </div>
      </section>

      {/* Errors */}
      <section id="errors" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t">
        <h2 className="text-2xl font-semibold mb-6">Errors</h2>
        <p className="text-muted-foreground mb-6">
          La API usa codigos HTTP convencionales. Todos los errores tienen la misma estructura.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Code</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-left px-4 py-2 font-medium">Descripcion</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "400", type: "invalid_request_error", desc: "Parametros invalidos o faltantes" },
                  { code: "401", type: "authentication_error", desc: "API key invalida o faltante" },
                  { code: "403", type: "authorization_error", desc: "Scope insuficiente o feature no disponible" },
                  { code: "404", type: "not_found_error", desc: "Recurso no encontrado" },
                  { code: "409", type: "conflict_error", desc: "Conflicto (ej: idempotency key duplicada)" },
                  { code: "422", type: "validation_error", desc: "Error de validacion en el body" },
                  { code: "429", type: "rate_limit_error", desc: "Rate limit excedido" },
                  { code: "500", type: "internal_error", desc: "Error interno del servidor" },
                ].map((e) => (
                  <tr key={e.code} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs font-medium">{e.code}</td>
                    <td className="px-4 py-2 font-mono text-[10px]">{e.type}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Estructura de error</p>
            <pre className="text-xs font-mono overflow-x-auto"><code>{`{
  "error": {
    "type": "authentication_error",
    "code": "invalid_api_key",
    "message": "The API key provided is invalid.",
    "request_id": "req_abc123"
  }
}`}</code></pre>
            <p className="text-xs text-muted-foreground mt-4 mb-1">Cada respuesta incluye:</p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li><code className="bg-muted px-1 rounded">X-Request-Id</code> — ID unico del request para soporte</li>
              <li><code className="bg-muted px-1 rounded">X-HubEnts-Version</code> — Version de la API usada</li>
              <li>Headers de rate limit en toda respuesta</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Scalar API Reference */}
      <section className="border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-semibold mb-6">API Reference</h2>
        </div>
        <div ref={scalarRef} className="min-h-150" />
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <p>HubEnts API v2025-01-01 — Powered by NapsixAI</p>
          <div className="flex gap-4">
            <a href="/api/v1/openapi" target="_blank" className="hover:text-foreground">OpenAPI</a>
            <Link href="/developers/changelog" className="hover:text-foreground">Changelog</Link>
            <a href="/api/v1/mcp" target="_blank" className="hover:text-foreground">MCP</a>
            <Link href="/auth/login" className="hover:text-foreground">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
