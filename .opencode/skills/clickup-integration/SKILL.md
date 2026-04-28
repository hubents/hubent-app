---
name: clickup-integration
description: ClickUp env vars (NapsixAI team 90132561531), server client at @/lib/clickup for read/update/move/comment tasks, error-reporter usage, comment formatting rules, and review-state workflow. Use for any HubEnts ClickUp flow, scripts, or MCP. Never commit secrets.
metadata:
  audience: agents
  workflow: clickup
---

# ClickUp Integration

> **Fuente única de verdad:** `.cursor/skills/clickup-integration/SKILL.md`
> Espejo OpenCode — sincronizar ambos al editar.

## Variables (mismas que Vercel)

| Variable | Uso | Notas |
|----------|-----|-------|
| `CLICKUP_API_TOKEN` | `src/lib/monitoring/error-reporter.ts` | Solo Vercel/.env.local — **nunca** commitear |
| `CLICKUP_MONITORING_LIST_ID` | misma ruta | Default `901322179370` si falta |
| `CLICKUP_TEAM_ID` | `src/lib/clickup` | Workspace NapsixAI: `90132561531` |
| `CLICKUP_CLIENT_ID` | OAuth/scripts | Mantener parity Vercel↔Windsurf |
| `CLICKUP_CLIENT_SECRET` | OAuth/scripts | **Secreto** — solo Vercel/.env.local |

## Cliente server-side `@/lib/clickup`

| Función | API ClickUp | Uso |
|---------|-------------|-----|
| `getClickUpTask(id)` | GET `/task/{id}` | Leer (id interno o custom `86afx36wc`) |
| `getClickUpListTasks(listId, params?)` | GET `/list/{id}/task` | Listar lista |
| `getClickUpWorkspaceTasks(params?)` | GET `/team/{teamId}/task` | 100/pág workspace |
| `updateClickUpTask(id, body)` | PUT `/task/{id}` | Editar nombre, desc, **status**, prioridad, fechas |
| `moveClickUpTaskToList(id, listId)` | PUT con `list_id` | Mover de lista |
| `addClickUpTaskComment(id, text, opts?)` | POST comentario | Comentar (UTF-8 desde Node) |
| `getClickUpTaskComments(id)` | GET comentarios | Leer hilo |
| `createClickUpTask(listId, body)` | POST tarea | Crear (tickets automáticos) |
| `isClickUpConfigured()` | — | Comprobar token |

```typescript
import {
  getClickUpTask,
  updateClickUpTask,
  moveClickUpTaskToList,
  addClickUpTaskComment,
} from "@/lib/clickup";

// status = nombre exacto en esa lista
await updateClickUpTask("86afx36wc", { status: "review" });
await addClickUpTaskComment("86afx36wc", "Listo para revisión.\n\n—\nNapsixAI");
```

Capturar `ClickUpApiError` para `status` HTTP y body.

## Workflow de estados (CRÍTICO)

- Al finalizar una task, SIEMPRE mover a **review** (nunca a complete directamente)
- **review** es donde el cliente valida
- Solo mover a **complete** con aprobación explícita del usuario
- NUNCA cerrar tickets por iniciativa propia

## Formato de comentarios

```text
📋 Título breve

🔴 Antes (problema)
• Bullet 1
• Bullet 2

✅ Después (solución)
• Bullet 1
• Bullet 2

🔍 Auditoría (opcional)
• Bugs corregidos
• Tests

🚀 Deploy (opcional)
• Migración aplicada
• Commit hash → main → Vercel

📁 Archivos: archivo1.ts, archivo2.tsx

—
NapsixAI
```

Reglas:
- Sin markdown pesado (`#`, `##`, `**`, backticks de bloque, `---`)
- Bullets `•` (U+2022), no `-` ni `*`
- Nombres técnicos inline sin backticks
- Construir string en Node (script tsx, Server Action), NO en PowerShell
- Firma `—` + salto + `NapsixAI`

## error-reporter

`src/lib/monitoring/error-reporter.ts` usa `createClickUpTask` con dedup 24h. Requiere:
- `CLICKUP_API_TOKEN`
- `CLICKUP_MONITORING_LIST_ID` (default `901322179370`)

## Branding

**SIEMPRE** "NapsixAI" en contenido orientado al cliente. NO usar nombres de IDEs/editores en tickets/comentarios.

## ClickUp MCP en OpenCode

Configurado en `opencode.jsonc` → `mcp.clickup-integration`. Endpoint: `https://mcp.clickup.com/mcp`. OAuth se completa al primer uso desde el TUI/IDE.

## See also

- `.cursor/rules/hubents-clickup-comments.mdc` — formato detallado
- `.env.example` — sección ClickUp
- Skill `hubents-deploy` — release con informes
