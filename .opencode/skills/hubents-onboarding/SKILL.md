---
name: hubents-onboarding
description: First skill to load when starting a new OpenCode session on HubEnts. Provides the project map, tech stack, current production state, key entry files, and pointers to other skills/rules. Use this when the agent needs context about HubEnts before any other task.
metadata:
  audience: agents
  workflow: bootstrap
---

# HubEnts — OpenCode Onboarding

> Cargar este skill al inicio de sesión nueva o cuando el agente necesite contexto rápido del proyecto.

## Identidad del proyecto

- **Producto:** HubEnts — plataforma SaaS multi-tenant para gestión de eventos (bodas, fiestas, corporativos)
- **URL prod:** https://app.hubents.com
- **Vercel project:** `hubents-new`
- **Repo:** `german-gimenez/hubents-app` (rama default: `main`)
- **Org:** NapsixAI
- **Estado:** Producción — facturando suscripciones (Stripe)

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript 5 strict
- NextAuth v5 (Google, Email magic-link, Credentials)
- Drizzle ORM + Neon PostgreSQL HTTP — **NUNCA** `db.transaction()`
- TailwindCSS v4 + shadcn/ui + Remix Icons
- Stripe dual: platform SaaS billing + tenant client payments
- Resend (email) + Cloudflare R2 (storage)
- Vercel AI SDK + AI Gateway (Gemini)
- Composio OAuth marketplace
- Vitest

## Arquitectura clave (resumen)

- **Portal unificado:** TODOS los org types usan `/dashboard`. NO existe `/vendor`. Middleware redirige `/vendor/*` → `/dashboard/*`.
- **7 roles universales:** `owner`, `admin`, `manager`, `accountant`, `staff`, `viewer`, `client`. Sin roles provider-específicos.
- **Plan-driven features:** event creation, portfolio, public profile gated por plan flags, no por orgType.
- **Cross-org collaboration:** `ensureProviderEventAccess()` en `src/lib/cross-org.ts` auto-crea acceso al asignar tareas.
- **5 planes activos:** Starter €14.50, Standard €29.50, Agency €49.50, Provider Free, Provider Pro €14.50.

## Archivos de entrada críticos

| Archivo | Propósito |
|---------|-----------|
| `src/db/schema.ts` | 55+ tablas Drizzle |
| `src/db/index.ts` | Conexión Neon HTTP |
| `src/lib/session.ts` | `requireAuth`, `requirePermission`, `requireLimit`, `requireFeature` |
| `src/lib/tenant.ts` | RBAC, hierarchy, plan info |
| `src/lib/event-permissions.ts` | Permisos event-scoped |
| `src/lib/cross-org.ts` | Colaboración entre orgs |
| `src/config/tenant-types.ts` | Sidebar, roles, routing por orgType |
| `src/config/provider-constants.ts` | Categorías, profile completeness |
| `src/middleware.ts` | Route protection + org context |
| `src/lib/stripe-platform.ts` | Stripe SaaS billing |
| `src/lib/clickup/` | Cliente ClickUp |
| `src/lib/monitoring/error-reporter.ts` | Error reporter → ClickUp |

## API patterns obligatorios

```typescript
// Standard response
return NextResponse.json({ success: true, data: result });
return NextResponse.json({ success: false, error: "msg" }, { status: 400 });

// Auth
const session = await requireAuth();
const session = await requirePermission("events:read");
const session = await requirePlatformAdmin();

// Env vars: SIEMPRE dentro de funciones, nunca a nivel de módulo
function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL;
}

// Emails fire-and-forget
sendEmail(to, subject, html).catch((err) =>
  console.error("Failed to send email:", err),
);
```

- `console.error` permitido en API; **NUNCA** `console.log` en producción
- Usar `withMonitoring` wrapper para API monitoring

## Skills disponibles (cargar bajo demanda)

| Skill | Cuándo |
|-------|--------|
| `hubents-deploy` | Deploy a Vercel, pre-deploy checks, push main |
| `hubents-database-migration` | Cambios schema Drizzle/Neon, migraciones, recovery |
| `neon-data-protection` | Branch protection, backups, integraciones Neon |
| `clickup-integration` | Comentarios, error-reporter, MCP ClickUp |
| `hubents-onboarding` | (este) — contexto inicial del proyecto |

## Reglas Cursor que aplican siempre (alwaysApply)

- `.cursor/rules/hubents-project-architecture.mdc`
- `.cursor/rules/hubents-workflow-skills.mdc`
- `.cursor/rules/hubents-unified-portal.mdc`

## Reglas Cursor con scope específico

- `hubents-rbac-provider.mdc` — `src/app/api/**/*.ts`
- `hubents-saas-billing.mdc` — `src/**/*stripe*`
- `hubents-ui-drawers.mdc` — `**/*.tsx` (Sheet vs Dialog)
- `hubents-api-changelog.mdc` — `src/lib/api/**/*.ts`
- `hubents-api-changelog-dates.mdc` — `src/app/developers/changelog/**/*.tsx`
- `hubents-clickup-comments.mdc` — formato comentarios ClickUp

## Datos sensibles (NUNCA pedir al usuario)

Variables ya configuradas como env globales:
- `GITHUB_TOKEN`, `CLICKUP_API_TOKEN` (también en Vercel)
- En Vercel: `STRIPE_*`, `RESEND_API_KEY`, `R2_*`, `GOOGLE_CLIENT_*`, `DATABASE_URL`, `COMPOSIO_API_KEY`, `CRON_SECRET`, `AI_GATEWAY_API_KEY`

Si algo falla por env vars en sesión local, sugerir `.env.local` con las claves; nunca pedir el valor.

## Workflow ClickUp (siempre aplicar)

- Al cerrar trabajo → mover task a **review** (nunca complete)
- Solo mover a **complete** con aprobación explícita del usuario
- Comentarios con formato definido en skill `clickup-integration`
- Firma siempre: `—` + salto + `NapsixAI`

## Convivencia Cursor / Windsurf / OpenCode

Las tres configuraciones coexisten. Mapa completo en `AGENTS.md` (sección "Triple parity"). Al editar reglas/skills, priorizar Cursor como fuente y mantener espejos OpenCode/Windsurf sincronizados.
