---
name: hubents-api-changelog-update
description: Update the public API changelog when adding/changing endpoints, OpenAPI spec, MCP tools, webhook event types, scopes, or rate limits. Use before releasing changes to /api/v1 surface. Includes date rules (Argentina UTC-03), CURRENT_API_VERSION sync, and SUPPORTED_VERSIONS.
metadata:
  audience: agents
  workflow: api-changelog
---

# HubEnts — API Changelog Update

> **Fuente única de verdad de la regla:** `.cursor/rules/hubents-api-changelog.mdc` y `hubents-api-changelog-dates.mdc`.
> Ejecutar este flujo ANTES de hacer commit cuando se toque el surface público.

## Cuándo usar

Cualquier cambio en:
- Endpoints `/api/v1/*` (nuevo, modificado, eliminado)
- `src/lib/api/openapi-spec.ts`
- MCP tools / resources (`src/lib/api/mcp-server.ts`)
- Webhook event types (`src/lib/api/api-webhooks.ts`)
- Scopes (`src/lib/api/api-auth.ts`)
- Rate limits / feature flags (`src/lib/api/api-feature-flags.ts`)

## Tipos de entrada

| Tipo | Cuándo |
|------|--------|
| `added` | Nuevo endpoint, scope, webhook event, MCP tool |
| `changed` | Endpoint modificado (breaking → nueva versión) |
| `deprecated` | Marcado para eliminar en futuro |
| `removed` | Eliminado (REQUIERE nueva versión) |
| `fixed` | Bug fix sin cambio de surface |
| `security` | Fix de seguridad |

## Versionado

- **Date-based:** `YYYY-MM-DD`
- Breaking changes → nueva versión obligatoria
- Backwards-compatible → agregar a versión actual
- Header `X-HubEnts-Version` refleja la versión actual

## Reglas de fecha (Argentina UTC-03)

- `version` y `date`: fecha real del día actual (NO hardcodear)
- Verificar año desde metadata del sistema antes de escribir
- Versión anterior pasa a `current: false`
- `CURRENT_API_VERSION` en `src/lib/api/api-versioning.ts` debe sincronizarse
- Versión anterior permanece en `SUPPORTED_VERSIONS`

## Archivos a actualizar

1. `src/app/developers/changelog/page.tsx` — entry del changelog
2. `src/lib/api/api-versioning.ts` — `CURRENT_API_VERSION` y `SUPPORTED_VERSIONS`
3. `src/lib/api/openapi-spec.ts` — si hay nuevo endpoint/schema
4. `src/lib/api/mcp-server.ts` — si hay nuevo MCP tool
5. `src/lib/api/api-webhooks.ts` — si hay nuevo webhook event
6. `src/lib/api/api-auth.ts` — si hay nuevo scope
7. `src/lib/api/api-feature-flags.ts` — si hay nuevo feature flag de API
8. `README.md` — si afecta a developers

## Ejemplo de entrada

```typescript
// src/app/developers/changelog/page.tsx
{
  version: "2026-04-28",
  date: "2026-04-28",
  current: true,
  changes: [
    { type: "added", text: "POST /api/v1/events/{id}/share — endpoint to share event publicly" },
    { type: "changed", text: "GET /api/v1/tasks now returns participant scope info" },
  ],
}
```

```typescript
// src/lib/api/api-versioning.ts
export const CURRENT_API_VERSION = "2026-04-28";
export const SUPPORTED_VERSIONS = ["2026-04-28", "2026-03-12", /* ... */];
```

## Workflow

1. Implementar el cambio en código
2. Detectar fecha actual (UTC-03)
3. Actualizar archivos de la lista (mínimo 1, 2 y los que apliquen)
4. Marcar versión anterior `current: false`
5. Pasar tests → `npx vitest run`
6. Commit + skill `hubents-deploy`

## Related

- Rule `.cursor/rules/hubents-api-changelog.mdc`
- Rule `.cursor/rules/hubents-api-changelog-dates.mdc`
- Skill `hubents-deploy` — release después de actualizar changelog
