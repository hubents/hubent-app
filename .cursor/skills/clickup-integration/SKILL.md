---
name: clickup-integration
description: >-
  ClickUp env vars (NapsixAI team 90132561531), server client at @/lib/clickup
  for read/update/move/comment tasks, error-reporter, and NapsixAI branding.
  Use for HubEnts ClickUp flows, scripts, or MCP. Never commit secrets.
---

# ClickUp Integration Skill

## Variables (mismas que Vercel y `.windsurf/skills/clickup-integration/SKILL.md`)

| Variable                     | Uso en HubEnts hoy                                                                      | Notas                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `CLICKUP_API_TOKEN`          | **Sí** — [`src/lib/monitoring/error-reporter.ts`](src/lib/monitoring/error-reporter.ts) | Valor = el ya cargado en Vercel; **no** commitear         |
| `CLICKUP_MONITORING_LIST_ID` | **Sí** — misma ruta                                                                     | Si falta en env, el código usa `901322179370` por defecto |
| `CLICKUP_TEAM_ID`            | **Sí** — [`src/lib/clickup`](src/lib/clickup) (`getClickUpWorkspaceTasks`)              | Workspace **NapsixAI**: `90132561531` (no es secreto)     |
| `CLICKUP_CLIENT_ID`          | No leído por Next.js aún                                                                | Mantener en Vercel = Windsurf para OAuth/scripts          |
| `CLICKUP_CLIENT_SECRET`      | No leído por Next.js aún                                                                | **Secreto** — solo Vercel / `.env.local`; no commitear    |

**Fuente de valores:** dashboard de Vercel (Production) y skill Windsurf interna. En repo solo está documentado en [`.env.example`](.env.example) (sin secretos).

## Cliente server-side (`@/lib/clickup`)

Usar **siempre** este módulo en Server Actions, API routes, scripts `tsx` y `error-reporter` para headers y errores consistentes (`ClickUpApiError`).

| Función                                      | API ClickUp               | Uso                                                              |
| -------------------------------------------- | ------------------------- | ---------------------------------------------------------------- |
| `getClickUpTask(taskId)`                     | GET `/task/{id}`          | Leer tarea (id interno o custom id tipo `86afx36wc`)             |
| `getClickUpListTasks(listId, params?)`       | GET `/list/{id}/task`     | Listar tareas de una lista                                       |
| `getClickUpWorkspaceTasks(params?)`          | GET `/team/{teamId}/task` | Listar hasta 100 tareas/página del workspace (`CLICKUP_TEAM_ID`) |
| `updateClickUpTask(taskId, body)`            | PUT `/task/{id}`          | Editar nombre, descripción, **status**, prioridad, fechas        |
| `moveClickUpTaskToList(taskId, listId)`      | PUT con `list_id`         | Mover a otra lista                                               |
| `addClickUpTaskComment(taskId, text, opts?)` | POST comentario           | Comentar (markdown; usar Node para UTF-8/emojis)                 |
| `getClickUpTaskComments(taskId)`             | GET comentarios           | Leer hilo                                                        |
| `createClickUpTask(listId, body)`            | POST tarea                | Crear (p. ej. tickets automáticos)                               |
| `isClickUpConfigured()`                      | —                         | Comprobar token antes de llamar                                  |

```typescript
import {
  getClickUpTask,
  getClickUpListTasks,
  getClickUpWorkspaceTasks,
  updateClickUpTask,
  moveClickUpTaskToList,
  addClickUpTaskComment,
  getClickUpTaskComments,
} from "@/lib/clickup";

// Status = nombre exacto del estado en esa lista en ClickUp
await updateClickUpTask("86afx36wc", { status: "complete" });
await moveClickUpTaskToList("86afx36wc", "OTHER_LIST_ID");
await addClickUpTaskComment(
  "86afx36wc",
  "Listo para revisión.\n\n---\n*NapsixAI*",
);
```

**Errores:** capturar `ClickUpApiError` para `status` HTTP y cuerpo de respuesta.

## Qué usa HubEnts en producción

[`src/lib/monitoring/error-reporter.ts`](src/lib/monitoring/error-reporter.ts) usa `createClickUpTask` de `@/lib/clickup` para crear tareas en la lista de monitoring (deduplicación 24h). Requiere:

- `CLICKUP_API_TOKEN`
- `CLICKUP_MONITORING_LIST_ID` (recomendado explícito; default `901322179370`)

## Configuración local / Vercel

```bash
# Definir en .env.local o Vercel — nunca en archivos versionados (salvo .env.example sin valores secretos)
CLICKUP_API_TOKEN=
CLICKUP_TEAM_ID=90132561531
CLICKUP_MONITORING_LIST_ID=901322179370
CLICKUP_CLIENT_ID=
CLICKUP_CLIENT_SECRET=
```

## Enviar comentarios con emojis

**IMPORTANTE:** Ejecutar código que construya el string en **Node** (script `tsx`, Server Action, API route), no pegar UTF-8 raro desde PowerShell.

Preferir:

```typescript
import { addClickUpTaskComment } from "@/lib/clickup";

await addClickUpTaskComment("86afx36wc", "# Reporte...\n\n---\n*NapsixAI*");
```

## Branding en tareas automáticas

**SIEMPRE usar "NapsixAI"** en comentarios y descripciones. Firma al final: `—` + salto + `NapsixAI`.

**NO usar** nombres de editores/IDEs en contenido orientado al cliente.

## Formato de comentarios

Ver regla **`.cursor/rules/hubents-clickup-comments.mdc`** para el formato estándar. Resumen:

- Emojis como separadores de sección (📋 🔴 ✅ 🔍 🚀 📁), no `#` ni `##`
- Bullets con `•`, no `-` ni `*`
- Sin backticks de bloque ni markdown pesado
- Construir string en Node, no PowerShell

## Notas

- Team ID `90132561531` es compartido entre proyectos NapsixAI.
- Si credenciales se filtraron alguna vez en Git, rotarlas en ClickUp y actualizar solo Vercel.

## See also

- [`.env.example`](.env.example) — sección ClickUp
- `.cursor/rules/hubents-workflow-skills.mdc`
- Skill `hubents-deploy` — release junto a informes

## Source

Alineado con `.windsurf/skills/clickup-integration/SKILL.md` (Windsurf sin cambios; aquí sin secretos en el cuerpo).
