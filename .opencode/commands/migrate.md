---
description: Workflow de migración Drizzle/Neon (skill hubents-database-migration)
agent: build
---

Ejecuta el workflow del skill `hubents-database-migration` para HubEnts:

1. Carga el skill `hubents-database-migration` para tener todas las reglas Neon HTTP
2. Confirma que `DATABASE_URL` está disponible en `.env.local`
3. Si no se especificó cambio, pregunta al usuario: ¿qué tabla/columna/índice se modifica?
4. Edita `src/db/schema.ts` con el cambio propuesto
5. Crea archivo SQL idempotente en `drizzle/XXXX_description.sql` (XXXX = siguiente número)
6. Si la migración es compleja, crea `scripts/apply-migration-XXXX.ts`
7. Aplica la migración (`npx tsx scripts/apply-migration-XXXX.ts` o `drizzle-kit push`)
8. Corre `npx vitest run`
9. Recuerda al usuario:
   - NUNCA usar `db.transaction()` (Neon HTTP no lo soporta)
   - Branches `vercel-dev-recovered` y `production` están PROTEGIDAS — no removerlas
   - Tras pasar tests, ejecutar `/deploy` para release

Argumentos: $ARGUMENTS (descripción corta del cambio de schema).
