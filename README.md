# HubEnts

Plataforma SaaS integral para gestión de bodas y eventos. Multi-tenant con soporte para organizadores (tenants) y proveedores (vendors).

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **Lenguaje** | TypeScript (strict) |
| **Base de datos** | PostgreSQL (Neon) + Drizzle ORM |
| **Auth** | NextAuth v5 (credentials + magic link) |
| **Estilos** | Tailwind CSS v4 + shadcn/ui |
| **Iconos** | Remix Icons + Lucide React |
| **Pagos** | Stripe (checkout, subscriptions, invoices) |
| **Rate Limiting** | Upstash Redis (sliding window) |
| **AI** | Vercel AI SDK + AI Gateway |
| **Deploy** | Vercel |

## Características principales

### Plataforma
- Dashboard con estadísticas en tiempo real
- CRM con pipeline de ventas (leads, stages, kanban)
- Gestión de eventos con colaboradores y permisos por sección
- Sistema de tareas con checklist, participantes y scheduling
- Directorio de proveedores con asignación a eventos
- Gestión financiera (presupuestos, facturas, pagos, albaranes)
- Formularios dinámicos (RSVP, encuestas, custom)
- Lista de invitados con check-in, grupos y estadísticas
- Calendario integrado
- Chat y equipo con roles y permisos granulares
- Portal unificado para planificadores y proveedores (`/dashboard`)
- Panel de administración de plataforma (`/admin`)

### Public API (`/api/v1`)
- **40+ endpoints** RESTful con autenticación via API key (`Bearer hb_live_...`)
- **OpenAPI 3.1** spec completa servida en `/api/v1/openapi`
- **19 scopes granulares** (events, contacts, tasks, guests, CRM, finance, forms, vendors, webhooks, org)
- **Cursor pagination** estilo Stripe (`starting_after` / `ending_before`)
- **Rate limiting** con Upstash Redis (60-10,000 req/min según plan)
- **Idempotency** via header `Idempotency-Key` (24h TTL)
- **Webhooks** con 32+ event types, HMAC-SHA256 signing y retries automáticos
- **MCP Server** para integración con AI assistants (Claude, GPT) — 18 tools + 3 resources
- **Feature flags** por plan de suscripción
- **RBAC** completo: tenant vs provider scope restrictions (`PROVIDER_ALLOWED_SCOPES`)
- **Stripe-grade error responses** con `type`, `code`, `message`, `param`, `request_id`
- **snake_case** en todas las respuestas para consistencia

### Developer Portal (`/developers`)
- Documentación interactiva con Scalar UI
- Quick Start guide con 3 pasos
- Secciones dedicadas: Auth, Webhooks, Rate Limiting, Errors
- Changelog con date-based versioning (`/developers/changelog`)
- Links a OpenAPI JSON y MCP endpoint

### RBAC & Multi-tenancy
- Roles: owner, admin, planner, assistant, viewer, accountant (+ provider_owner, provider_admin, provider_member)
- Permisos granulares por recurso (`events:read`, `finance:write`, etc.)
- Event-scoped roles (solo ven eventos asignados)
- Colaboradores de eventos con permisos por sección (general, tasks, guests, rsvp, vendors, finances, settings)
- Provider scope restrictions: 7 scopes permitidos de 19 totales
- API keys con scopes filtrados por `orgType`

## Instalación

```bash
npm install
cp .env.example .env.local  # Configurar variables
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | Verificar código |
| `npm run test` | Ejecutar tests (Vitest) |
| `npx drizzle-kit generate` | Generar migración |
| `npx drizzle-kit push` | Aplicar migración |

## Estructura del Proyecto

```
src/
├── app/
│   ├── api/v1/             # Public API (40+ endpoints)
│   ├── api/                # Internal APIs (settings, team, billing, etc.)
│   ├── dashboard/          # Tenant portal
│   ├── vendor/             # Provider portal
│   ├── admin/              # Platform admin
│   ├── developers/         # Developer portal + changelog
│   └── auth/               # Login, register, magic link
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Sidebars, headers, guards
│   ├── events/             # Event-specific components
│   └── ...                 # Feature-specific components
├── contexts/               # React contexts (user session, events, AI)
├── hooks/                  # Custom hooks
└── lib/
    ├── api/                # API layer (auth, wrapper, errors, rate-limit, webhooks, MCP, OpenAPI)
    ├── db/                 # Drizzle schema + queries
    └── ...                 # Session, tenant, events, permissions
```

## Variables de Entorno

Ver `.env.example` para la lista completa. Las principales:

```env
DATABASE_URL=                          # Neon PostgreSQL
NEXTAUTH_SECRET=                       # NextAuth secret
NEXTAUTH_URL=                          # App URL

STRIPE_PLATFORM_SECRET_KEY=            # Stripe API key
STRIPE_WEBHOOK_SECRET=                 # Stripe webhook signing

UPSTASH_REDIS_REST_URL=                # Rate limiting
UPSTASH_REDIS_REST_TOKEN=              # Rate limiting

OPENAI_API_KEY=                        # AI features (optional)
```

## API Quick Start

```bash
# 1. Crear API key desde Settings > Developers

# 2. Listar eventos
curl https://hubents.com/api/v1/events \
  -H "Authorization: Bearer hb_live_..." \
  -H "Content-Type: application/json"

# 3. Crear un evento
curl -X POST https://hubents.com/api/v1/events \
  -H "Authorization: Bearer hb_live_..." \
  -H "Content-Type: application/json" \
  -d '{"name": "Boda García", "type": "wedding"}'
```

Documentación completa: [/developers](https://hubents.com/developers)

## Tests

```bash
# Ejecutar todos los tests de API
npm run test -- src/__tests__/api/

# 10 suites, 245 tests
# - api-audit, api-gaps-completion, api-rbac-provider
# - api-endpoints-structure, contacts, finance, forms
```

## Deploy

El proyecto está en Vercel con deploy automático:

1. Push a `main` → deploy a producción
2. Push a cualquier branch → preview deployment
3. Variables de entorno configuradas en Vercel Dashboard

## Licencia

Privado - HubEnts © 2024-2026 — Powered by NapsixAI
