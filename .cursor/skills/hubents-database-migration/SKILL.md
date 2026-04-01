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

## Neon branch protection (CRITICAL)

The `production` branch is **protected** in Neon (Scale plan). This means:
- It **cannot be deleted** — not by users, not by integrations
- It **cannot be reset** from a parent branch
- The project **cannot be deleted** while it has protected branches
- Computes associated with it **cannot be deleted**

**NEVER remove branch protection.** If you need to test schema changes, create a child branch.

### History retention

History retention is set to **30 days** (2592000 seconds). This allows PITR (Point-in-Time Recovery) for any point within the last 30 days.

### Backups

A daily backup runs via GitHub Action (`.github/workflows/db-backup.yml`):
- Executes `pg_dump` every day at 06:00 UTC
- Uploads compressed backup to Cloudflare R2 (`backups/db/`)
- Also stored as GitHub artifact (30-day retention)
- Keeps last 30 backups in R2, auto-deletes older ones

### Neon-Vercel integration WARNING

The Neon-Vercel marketplace integration can **delete branches** during setup. On 2026-03-31 it ran `delete_timeline` on the production data branch, causing total data loss. The protected branch flag now prevents this. If you ever need to reconnect the integration:
1. Ensure the target branch is **protected** BEFORE connecting
2. Verify `DATABASE_URL` in Vercel points to the correct pooler endpoint
3. Do NOT let the integration create/manage branches that hold production data

### Disaster recovery checklist

If the DB needs to be rebuilt from scratch:
```
1. Fix DATABASE_URL in .env, .env.local, Vercel
2. npx drizzle-kit push (creates 107 tables)
3. npx tsx src/db/seed-roles.ts (creates legacy roles)
4. npx tsx scripts/migrate-provider-roles.ts (unifies to 7 roles)
5. npx tsx scripts/hard-reset-permissions.ts (canonical permissions)
6. npx tsx scripts/seed-plans.ts (5 plans + 9 feature flags)
7. npx tsx scripts/sync-stripe-products.ts (Stripe products/prices)
8. npx tsx scripts/create-admin.ts (super admin)
9. npx tsx scripts/seed-wedding-template.ts (optional)
10. npx tsx scripts/seed-all-templates.ts (optional)
11. Delete residual vendor/member roles from DB
12. npx tsx scripts/full-audit.ts (verify)
```

## Related project rules

- `.cursor/rules/hubents-project-architecture.mdc` — `db.transaction()` prohibition

## See also (skills)

- `hubents-deploy` — run DB helper scripts and push after schema changes
- `hubents-api-changelog-update` — if public API or versioning docs change with schema

## Source

Derived from `.windsurf/workflows/database-migration.md` (Windsurf copy unchanged).
