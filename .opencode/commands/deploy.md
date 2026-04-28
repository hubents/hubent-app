---
description: Pre-deploy checks + push a main (skill hubents-deploy)
agent: build
---

Ejecuta el flujo completo del skill `hubents-deploy` para HubEnts:

1. Carga el skill `hubents-deploy` para tener el checklist completo
2. Verifica que la rama actual sea `main` y esté limpia (`git status`)
3. Corre TypeScript noEmit: `npx tsc --noEmit --pretty`
4. Corre Vitest: `npx vitest run`
5. Escanea `console.log` en `src/app/api/` (debería estar vacío; solo `console.error` permitido)
6. Si tocó schema/seed/permisos, ejecuta los scripts correspondientes
7. Muestra los cambios pendientes (`git diff --stat`) y propone un mensaje de commit corto siguiendo el estilo del proyecto (`type: description`, ej. `fix(tasks): ...`)
8. PIDE confirmación explícita antes de ejecutar `git add -A`, `git commit` y `git push origin main`
9. Tras push, recuerda al usuario:
   - Smoke test manual en https://app.hubents.com
   - Verificar branches Neon protegidas
   - Confirmar `DATABASE_URL` en Vercel

Si cualquier paso falla, detén el flujo y reporta el problema sin pushear.

Argumentos opcionales: $ARGUMENTS (mensaje de commit sugerido).
