# HubEnts — Agent entry map (Cursor / Windsurf / OpenCode)

Tres clientes de agentes conviven en este repo y comparten la misma fuente de verdad documental:

- **Cursor** → `.cursor/` (rules + skills) — fuente principal
- **Windsurf** → `.windsurf/` (rules + workflows + skills)
- **OpenCode** → `.opencode/` (skills + agents + commands) + `opencode.jsonc` en root

Si editás convenciones en un lugar, **espejá los otros** hasta unificar el proceso. Cursor es la fuente de verdad para nuevas reglas; los otros dos siguen.

**ClickUp MCP:**
- Cursor: [`.cursor/mcp.json`](.cursor/mcp.json) → `clickup-integration` → `https://mcp.clickup.com/mcp`. Autenticá en **Settings → MCP** y revisá [`.cursor/MCP-CLICKUP.md`](.cursor/MCP-CLICKUP.md) si OAuth pide redirect URL.
- OpenCode: [`opencode.jsonc`](opencode.jsonc) → mismo endpoint en `mcp.clickup-integration`. OAuth desde TUI/IDE.

**ClickUp workflow de estados:** Al finalizar una task, SIEMPRE mover a **review** (nunca a complete). Solo mover a **complete** con aprobación explícita del usuario. El estado review es donde el cliente valida el trabajo.

## Cursor rules (`.cursor/rules/`)

| File                               | Purpose                                                            |
| ---------------------------------- | ------------------------------------------------------------------ |
| `hubents-project-architecture.mdc` | Stack, routes, API patterns, key files — **always on**             |
| `hubents-workflow-skills.mdc`      | Points agents to workflow skills + suggested order — **always on** |
| `hubents-unified-portal.mdc`       | Unified portal rules, universal roles, plan features — **always on** |
| `hubents-api-changelog.mdc`        | When/how to update public API changelog and related libs           |
| `hubents-api-changelog-dates.mdc`  | Real dates (AR), `CURRENT_API_VERSION`, `SUPPORTED_VERSIONS`       |
| `hubents-rbac-provider.mdc`        | Unified RBAC (7 roles), provider architecture, cross-org patterns  |
| `hubents-saas-billing.mdc`         | Dual Stripe, plans, webhooks                                       |
| `hubents-ui-drawers.mdc`           | Sheet/drawer vs Dialog, sizing grid                                |

Tip: start a session with `@AGENTS.md` or `@.cursor/rules/hubents-project-architecture.mdc`.

## Project skills — workflows (`.cursor/skills/`)

| Skill (`name`)                 | When to use                                                               |
| ------------------------------ | ------------------------------------------------------------------------- |
| `hubents-deploy`               | Deploy/release to Vercel, pre-deploy checks, push `main`, smoke checklist |
| `hubents-database-migration`   | Drizzle/Neon schema + `drizzle/*.sql` + apply scripts                     |
| `hubents-api-changelog-update` | Changes to `/api/v1`, OpenAPI, MCP, webhooks, scopes, developer changelog |

**Suggested order:** schema/migrations → API changelog (if public API touched) → deploy.

## Project skills — domain (`.cursor/skills/`)

| Skill (`name`)        | When to use                                                                      |
| --------------------- | -------------------------------------------------------------------------------- |
| `create-drawer`       | New `Sheet` drawer component patterns                                            |
| `provider-portal`     | Unified provider flows: registration, onboarding, collaboration, cross-org tasks |
| `pdf-download`        | Client-side PDF via `downloadPDFFromHTML` (no Puppeteer for user-triggered PDFs) |
| `clickup-integration` | ClickUp env (Vercel/Windsurf parity), comments, `error-reporter` — ver abajo     |
| `neon-data-protection` | Neon branch protection, backups, disaster recovery, incident 2026-03-31           |

### ClickUp env (Vercel / Windsurf parity)

- Nombres y IDs documentados en [`.env.example`](.env.example) (Team `90132561531`, lista monitoring default `901322179370`).
- Secretos (`CLICKUP_API_TOKEN`, `CLICKUP_CLIENT_SECRET`) solo en Vercel o `.env.local`; detalle en [`.cursor/skills/clickup-integration/SKILL.md`](.cursor/skills/clickup-integration/SKILL.md).
- Runtime HubEnts: cliente [`src/lib/clickup`](src/lib/clickup) (leer / listar / editar / mover / comentar) y [`src/lib/monitoring/error-reporter.ts`](src/lib/monitoring/error-reporter.ts) (crear tickets).

### Fast deploy: GitHub → Vercel → Neon

- **GitHub:** repo conectado a Vercel; push a `main` despliega producción; PRs → preview.
- **Vercel:** build Next.js + env (`DATABASE_URL`, ClickUp, `CRON_SECRET`, etc.); crons en [`vercel.json`](vercel.json) (`/api/cron/*`).
- **Neon:** `DATABASE_URL` apunta al pooler `ep-gentle-moon-ahp5x11a-pooler` (branch `vercel-dev-recovered`); proyecto `late-dream-83661145`.
- Checklist previo a `main`: skill `hubents-deploy` (`tsc`, `vitest`, migraciones si hubo schema).

### Data protection (CRITICAL) — see skill `neon-data-protection`

**Neon project:** `late-dream-83661145` (hubents-app), org NapsixAI, 2 branches only:

| Branch | ID | Endpoint | Role |
|--------|----|----------|------|
| `vercel-dev-recovered` | `br-little-surf-ahyce57i` | `ep-gentle-moon-ahp5x11a-pooler` | **PRODUCTION DATA** — PROTECTED |
| `production` | `br-noisy-band-ahvj6vrk` | `ep-floral-sea-ahusfae7-pooler` | Emergency backup — PROTECTED |

- **Both branches are PROTECTED** — cannot be deleted, reset, or archived. NEVER remove protection.
- **History retention: 30 days** — allows PITR for any point in the last month.
- **Daily backups:** GitHub Action [`.github/workflows/db-backup.yml`](.github/workflows/db-backup.yml) runs `pg_dump` daily at 06:00 UTC → Cloudflare R2 (`backups/db/`) + GitHub artifact (30-day retention).
- **Neon-Vercel integration WARNING:** The marketplace integration ran `delete_timeline` on an unprotected branch on 2026-03-31, causing total data loss. Protected branches prevent this. ALWAYS protect branches BEFORE connecting any integration.
- **Disaster recovery:** Full rebuild in skill `hubents-database-migration` (12-step). Full incident and lessons in skill `neon-data-protection`.

## Session routine (Cursor)

1. Open repo folder; wait for indexing.
2. Confirm rules appear under Cursor **Rules**.
3. For deploy / migration / API docs: say the skill name or `@.cursor/skills/<skill>/SKILL.md`.
4. Install deps if needed (`pnpm install` / `npm install` per project).
5. `git status` on the right branch before large agent refactors.

## Triple parity (Cursor / Windsurf / OpenCode)

| Cursor                                  | Windsurf                                          | OpenCode                                                                       |
| --------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| `.cursor/rules/*.mdc`                   | `.windsurf/rules/*.md`                            | `opencode.jsonc` → `instructions: [".cursor/rules/*.mdc", "AGENTS.md"]`        |
| `.cursor/skills/hubents-*/SKILL.md`     | `.windsurf/workflows/*.md`                        | `.opencode/skills/hubents-*/SKILL.md` (espejos que referencian a Cursor)      |
| `.cursor/skills/<domain>/SKILL.md`      | `.windsurf/skills/<domain>/SKILL.md`              | `.opencode/skills/<domain>/SKILL.md` (cuando aplica)                          |
| `.cursor/mcp.json`                      | (sin equivalente)                                 | `opencode.jsonc` → `mcp.clickup-integration`                                  |
| `@<rule>` / `@<skill>` mention          | Cascade rules                                     | Skills auto-load por descripción + `/comando` en `.opencode/commands/`        |

**Regla:** no eliminar ni editar `.windsurf/` o `.cursor/` cuando trabajes desde OpenCode. Las tres convenciones deben permanecer en sync.

## OpenCode entry map (`.opencode/` + `opencode.jsonc`)

Configuración principal: [`opencode.jsonc`](opencode.jsonc) (root). Inyecta como `instructions`:

- `AGENTS.md`
- `.cursor/rules/*.mdc` (rules de Cursor disponibles automáticamente)
- `.cursor/skills/*/SKILL.md`
- `.opencode/skills/*/SKILL.md`

Esto evita duplicar contenido — cualquier cambio en `.cursor/rules/` aparece de inmediato en sesiones OpenCode.

### Skills OpenCode (`.opencode/skills/`)

| Skill                          | Cuándo usarlo                                                          |
| ------------------------------ | ---------------------------------------------------------------------- |
| `hubents-onboarding`           | Bootstrap al inicio de sesión: stack, archivos clave, reglas críticas  |
| `hubents-deploy`               | Deploy/release a Vercel, pre-deploy checks, push `main`                |
| `hubents-database-migration`   | Drizzle/Neon schema, migraciones, recovery 12-step                     |
| `hubents-api-changelog-update` | Cambios en `/api/v1`, OpenAPI, MCP, webhooks, scopes                   |
| `neon-data-protection`         | Protección de branches Neon, backups, integraciones, incidente 2026-03-31 |
| `clickup-integration`          | Cliente `@/lib/clickup`, error-reporter, formato comentarios NapsixAI  |

### Comandos OpenCode (`.opencode/commands/`)

| Comando             | Acción                                                                |
| ------------------- | --------------------------------------------------------------------- |
| `/deploy`           | Pre-deploy checks completos + push a main (con confirmación)          |
| `/migrate`          | Workflow de migración Drizzle/Neon (idempotente, sin transactions)    |
| `/changelog`        | Update API public changelog con fecha real (UTC-03)                   |
| `/recover-context`  | Recarga AGENTS.md + skill onboarding cuando el agente pierde foco     |
| `/clickup-comment`  | Comentar y mover task a `review` con formato NapsixAI (no a complete) |
| `/tsc` y `/tests`   | Atajos para `tsc --noEmit` y `vitest run`                             |

### Subagentes OpenCode (`.opencode/agents/`)

| Agente              | Modo     | Propósito                                                              |
| ------------------- | -------- | ---------------------------------------------------------------------- |
| `hubents-reviewer`  | subagent | Audita diffs contra reglas Cursor sin modificar archivos               |
| `hubents-deployer`  | subagent | Ejecuta `hubents-deploy` con confirmaciones y locks anti force-push    |

Invocá un subagente con `@hubents-reviewer` o `@hubents-deployer` desde el TUI.

### Permisos por defecto en OpenCode

`opencode.jsonc` ya bloquea operaciones destructivas:
- `git push --force*` → `deny`
- `rm -rf *` → `deny`
- `drizzle-kit drop*` → `deny`
- `neonctl branches delete*` → `deny`
- `git reset --hard*` → `ask`

### Sesión OpenCode rápida

1. Abrir el repo en TUI/IDE OpenCode
2. (Primera vez) autenticar ClickUp MCP cuando OpenCode lo pida
3. Cargar contexto: `/recover-context` o pedir al agente que cargue `hubents-onboarding`
4. Para tareas grandes: usar el agente `plan` (built-in) primero, luego `build`
5. Para deploy: `/deploy` (con confirmación) o `@hubents-deployer`
6. Para review pre-merge: `@hubents-reviewer`
