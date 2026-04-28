---
name: hubents-database-migration
description: HubEnts database migrations with Drizzle ORM on Neon. Use when adding or changing tables, columns, indexes, migration SQL under drizzle/, apply scripts, Neon HTTP driver constraints (no transactions), idempotent SQL patterns, or disaster recovery rebuild from scratch.
metadata:
  audience: agents
  workflow: database
---

# HubEnts — Database migration workflow

> **Fuente única de verdad:** `.cursor/skills/hubents-database-migration/SKILL.md`
> Espejo OpenCode — sincronizar ambos al editar.

## Cuándo usar este skill

- Cambios en `src/db/schema.ts`
- Nuevos archivos en `drizzle/` o `scripts/apply-migration-*.ts`
- El usuario menciona Drizzle, Neon, PostgreSQL migration, o "run migration"

## Steps

### 1. Modificar el schema

Editar `src/db/schema.ts`.

### 2. Crear SQL de migración en `drizzle/`

```text
drizzle/XXXX_description.sql
```

`XXXX` = siguiente número secuencial.

### 3. SQL idempotente

```sql
ALTER TABLE "table_name" ADD COLUMN IF NOT EXISTS "column_name" text;
CREATE INDEX IF NOT EXISTS "idx_name" ON "table_name" ("column_name");
```

### 4. Apply script (migraciones complejas)

```text
scripts/apply-migration-XXXX.ts
```

### 5. Aplicar y testear

```powershell
npx tsx scripts/apply-migration-XXXX.ts
npx vitest run
```

## Reglas críticas Neon HTTP

- **NUNCA** usar `db.transaction()` — Neon HTTP driver no lo soporta
- Migraciones deben ser **idempotentes** (safe re-run)
- Seed data: upsert / check-then-insert

## Neon branch protection (CRITICAL)

Branch `production` y `vercel-dev-recovered` están **protegidas** (Scale plan):
- No se pueden eliminar (ni por usuarios, ni integraciones, ni API)
- No se pueden resetear desde parent
- El proyecto no se puede eliminar mientras tenga branches protegidas
- **NUNCA remover protección.** Para tests, crear child branch.

## History retention

30 días (2592000 s) — permite PITR para cualquier punto del último mes.

## Backups diarios

`.github/workflows/db-backup.yml`:
- `pg_dump` via `docker run postgres:16` (NO apt-get — falla en Ubuntu 24+)
- AWS CLI v2 pre-instalado en runner
- Credenciales `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` desde secrets `R2_*`
- Sube backup comprimido a R2 (`backups/db/`) + GitHub artifact 30d
- Mantiene últimos 30 backups en R2
- Diario 06:00 UTC + `workflow_dispatch`

## Neon-Vercel integration WARNING

La integración marketplace puede **borrar branches** durante el setup. El 2026-03-31 ejecutó `delete_timeline` sobre la branch con datos productivos, causando pérdida total. La protección ahora previene esto. Si reconectas:

1. Asegurar que la branch destino esté **protegida** ANTES de conectar
2. Verificar `DATABASE_URL` en Vercel apunta al pooler correcto
3. NO dejar que la integración cree/gestione branches con datos de producción

## Disaster recovery (12 pasos)

```powershell
# 1. Fix DATABASE_URL en .env, .env.local, Vercel
# 2. Schema (107 tablas)
npx drizzle-kit push

# 3. Roles legacy
$env:DATABASE_URL = "postgresql://..."
npx tsx src/db/seed-roles.ts

# 4. Unificar a 7 roles
npx tsx scripts/migrate-provider-roles.ts

# 5. Permisos canónicos
npx tsx scripts/hard-reset-permissions.ts

# 6. Plans + feature flags
npx tsx scripts/seed-plans.ts

# 7. Stripe products/prices
npx tsx scripts/sync-stripe-products.ts

# 8. Super admin
npx tsx scripts/create-admin.ts

# 9. Templates (opcional)
npx tsx scripts/seed-wedding-template.ts
npx tsx scripts/seed-all-templates.ts

# 10. Borrar roles vendor/member residuales
# DELETE FROM roles WHERE slug IN ('vendor','member') AND organization_id IS NULL

# 11. Auditoría
npx tsx scripts/full-audit.ts

# 12. Proteger branch (API o Neon Console)
```

## Related

- Rule `.cursor/rules/hubents-project-architecture.mdc` — `db.transaction()` prohibido
- Skill `hubents-deploy` — scripts DB y push después de schema
- Skill `neon-data-protection` — incidente y prevención completa
