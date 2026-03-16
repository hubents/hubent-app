---
description: How to create and apply database migrations with Drizzle ORM on Neon
---

# Database Migration Workflow

## When to run
When you need to add/modify tables, columns, or indexes in the PostgreSQL database.

## Steps

1. **Modify the schema** in `src/db/schema.ts`

2. **Create a migration SQL file** in `drizzle/` with the naming convention:
   ```
   drizzle/XXXX_description.sql
   ```
   Where XXXX is the next sequential number (check existing files).

3. **Write the SQL** — always use `IF NOT EXISTS` / `IF EXISTS` for idempotency:
   ```sql
   ALTER TABLE "table_name" ADD COLUMN IF NOT EXISTS "column_name" text;
   CREATE INDEX IF NOT EXISTS "idx_name" ON "table_name" ("column_name");
   ```

4. **Create an apply script** if the migration is complex:
   ```
   scripts/apply-migration-XXXX.ts
   ```

5. **Apply the migration** (needs DATABASE_URL):
// turbo
   ```
   npx tsx scripts/apply-migration-XXXX.ts
   ```

6. **Test** that the schema changes work:
// turbo
   ```
   npx vitest run
   ```

## Important Notes
- Neon HTTP driver does NOT support `db.transaction()` — never use it
- Always make migrations idempotent (safe to re-run)
- For seed data, use upsert pattern (check exists → update or insert)
- After migration, verify in Neon console if needed: https://console.neon.tech
