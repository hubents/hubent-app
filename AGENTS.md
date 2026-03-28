# HubEnts — Agent / Cursor entry map

Windsurf configuration remains in **`.windsurf/`** (unchanged). **Cursor** uses **`.cursor/`** only. If you edit conventions in one place, mirror updates in the other until you unify your process.

**ClickUp MCP (IDE):** [`.cursor/mcp.json`](.cursor/mcp.json) registra `clickup-integration` → `https://mcp.clickup.com/mcp`. Tras abrir el repo, autentica en **Settings → MCP** y revisa [`.cursor/MCP-CLICKUP.md`](.cursor/MCP-CLICKUP.md) si OAuth pide redirect URL.

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

### ClickUp env (Vercel / Windsurf parity)

- Nombres y IDs documentados en [`.env.example`](.env.example) (Team `90132561531`, lista monitoring default `901322179370`).
- Secretos (`CLICKUP_API_TOKEN`, `CLICKUP_CLIENT_SECRET`) solo en Vercel o `.env.local`; detalle en [`.cursor/skills/clickup-integration/SKILL.md`](.cursor/skills/clickup-integration/SKILL.md).
- Runtime HubEnts: cliente [`src/lib/clickup`](src/lib/clickup) (leer / listar / editar / mover / comentar) y [`src/lib/monitoring/error-reporter.ts`](src/lib/monitoring/error-reporter.ts) (crear tickets).

### Fast deploy: GitHub → Vercel → Neon

- **GitHub:** repo conectado a Vercel; push a `main` despliega producción; PRs → preview.
- **Vercel:** build Next.js + env (`DATABASE_URL`, ClickUp, `CRON_SECRET`, etc.); crons en [`vercel.json`](vercel.json) (`/api/cron/*`).
- **Neon:** `DATABASE_URL` apunta al pooler/serverless; integración Neon↔Vercel recomendada en dashboards.
- Checklist previo a `main`: skill `hubents-deploy` (`tsc`, `vitest`, migraciones si hubo schema).

## Session routine (Cursor)

1. Open repo folder; wait for indexing.
2. Confirm rules appear under Cursor **Rules**.
3. For deploy / migration / API docs: say the skill name or `@.cursor/skills/<skill>/SKILL.md`.
4. Install deps if needed (`pnpm install` / `npm install` per project).
5. `git status` on the right branch before large agent refactors.

## Windsurf parity

| Windsurf path                                      | Cursor equivalent                                     |
| -------------------------------------------------- | ----------------------------------------------------- |
| `.windsurf/rules/*.md`                             | `.cursor/rules/*.mdc`                                 |
| `.windsurf/workflows/*.md`                         | `.cursor/skills/hubents-*/SKILL.md` (workflow skills) |
| `.windsurf/skills/*/SKILL.md` (and `pdf-download`) | `.cursor/skills/*/SKILL.md`                           |

Do **not** delete or edit `.windsurf/` for Cursor; keep both if the team uses either tool.
