---
description: Actualiza el API public changelog (skill hubents-api-changelog-update)
agent: build
---

Ejecuta el workflow del skill `hubents-api-changelog-update`:

1. Carga el skill `hubents-api-changelog-update`
2. Detecta la fecha actual real (Argentina UTC-03) — NO hardcodear
3. Inspecciona los cambios pendientes (`git diff` + `git status`) sobre:
   - `src/app/api/v1/**`
   - `src/lib/api/**`
4. Clasifica el tipo de cambio: `added` | `changed` | `deprecated` | `removed` | `fixed` | `security`
5. Determina si requiere nueva versión (breaking change) o se agrega a la actual
6. Actualiza:
   - `src/app/developers/changelog/page.tsx` (entry nuevo)
   - `src/lib/api/api-versioning.ts` (`CURRENT_API_VERSION`, `SUPPORTED_VERSIONS`)
   - Archivos relacionados (openapi-spec, mcp-server, api-webhooks, api-auth, api-feature-flags) si aplican
7. Marca la versión anterior `current: false`
8. Corre `npx vitest run`
9. Sugiere commit `feat(api): ...` o `chore(api-changelog): ...` y pasa la mano a `/deploy`

Argumentos: $ARGUMENTS (resumen del cambio de API).
