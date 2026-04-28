---
description: Recupera el contexto de HubEnts cuando el agente pierde foco
agent: build
---

El agente parece haber perdido contexto del proyecto. Recargar la base mínima:

1. Lee `AGENTS.md` para el mapa completo de paridad triple (Cursor / Windsurf / OpenCode)
2. Carga el skill `hubents-onboarding` para refrescar:
   - Stack tech (Next.js 16, Drizzle/Neon HTTP, NextAuth v5, Stripe dual, etc.)
   - Portal unificado (NO `/vendor`, 7 roles universales, plan-driven features)
   - Archivos clave (`src/db/schema.ts`, `src/lib/session.ts`, `src/lib/cross-org.ts`, etc.)
   - Reglas Cursor con `alwaysApply: true`
3. Lee `RESUMEN-PROYECTO.md` si necesita un overview ejecutivo de funcionalidades
4. Lee los últimos 10 commits con `git log --oneline -10` para ver el estado actual
5. Lee `git status` para ver qué cambios hay pendientes
6. Resume al usuario:
   - Estado de la rama y commits recientes
   - Cambios sin commitear (si los hay)
   - Cuál era la tarea que se estaba haciendo (si se puede inferir del diff)
   - Qué skill o flujo recomienda usar a continuación

Si hay tarea ClickUp activa mencionada en commits recientes, leerla con el cliente `@/lib/clickup` para sincronizar contexto.
