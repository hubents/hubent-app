---
name: hubents-database-migration
description: >-
  HubEnts database migrations with Drizzle ORM on Neon. Use when adding or
  changing tables, columns, indexes, migration SQL under drizzle/, apply scripts,
  Neon HTTP driver constraints, or idempotent SQL patterns.
---

# HubEnts — Database migration workflow

## When to use this skill

- Schema changes in `src/db/schema.ts`
- New files under `drizzle/` or `scripts/apply-migration-*.ts`
- User mentions Drizzle, Neon, PostgreSQL migration, or “run migration”

## Prerequisites

- `DATABASE_URL` set for apply scripts (e.g. from `.env.local`)

## Steps

### 1. Modify the schema

Edit `src/db/schema.ts`.

### 2. Create migration SQL in `drizzle/`

Naming:

```text
drizzle/XXXX_description.sql
```

`XXXX` = next sequential number (check existing files in `drizzle/`).

### 3. Write idempotent SQL

Prefer `IF NOT EXISTS` / `IF EXISTS`:

```sql
ALTER TABLE "table_name" ADD COLUMN IF NOT EXISTS "column_name" text;
CREATE INDEX IF NOT EXISTS "idx_name" ON "table_name" ("column_name");
```

### 4. Complex migrations — apply script

If needed, add:

```text
scripts/apply-migration-XXXX.ts
```

### 5. Apply the migration

Replace `XXXX` with your script name:

```powershell
npx tsx scripts/apply-migration-XXXX.ts
```

### 6. Test

```powershell
npx vitest run
```

## Important notes

- Neon HTTP driver **does not** support `db.transaction()` — **never** use it
- Migrations should be **idempotent** (safe to re-run)
- Seed data: prefer upsert / check-then-insert
- Verify in Neon console if needed: https://console.neon.tech

## Related project rules

- `.cursor/rules/hubents-project-architecture.mdc` — `db.transaction()` prohibition

## See also (skills)

- `hubents-deploy` — run DB helper scripts and push after schema changes
- `hubents-api-changelog-update` — if public API or versioning docs change with schema

## Source

Derived from `.windsurf/workflows/database-migration.md` (Windsurf copy unchanged).
