---
name: neon-data-protection
description: >-
  Neon branch protection, GitHub Action backups, disaster recovery, and the
  2026-03-31 incident where the Neon-Vercel integration deleted a production
  data branch. Use when working with Neon branches, connecting integrations,
  managing backups, or recovering from data loss.
---

# Neon Data Protection & Backup

## When to use this skill

- Connecting or modifying Neon integrations (Vercel, GitHub, etc.)
- Managing Neon branches (create, protect, delete)
- Setting up or debugging backups
- Recovering from data loss or corruption
- Reviewing database infrastructure safety

## Current infrastructure

### Neon project

- **Project:** `late-dream-83661145` (hubents-app)
- **Organization:** NapsixAI (`org-dry-water-28955192`)
- **Plan:** Scale (priority support, up to 5 protected branches)
- **Region:** `aws-us-east-1` (c-3)
- **History retention:** 30 days (2592000 seconds)

### Branches (2 total, both PROTECTED)

| Branch | ID | Endpoint (pooler) | Role |
|--------|----|-------------------|------|
| `vercel-dev-recovered` | `br-little-surf-ahyce57i` | `ep-gentle-moon-ahp5x11a-pooler.c-3.us-east-1.aws.neon.tech` | Production data |
| `production` | `br-noisy-band-ahvj6vrk` | `ep-floral-sea-ahusfae7-pooler.c-3.us-east-1.aws.neon.tech` | Emergency backup |

**DATABASE_URL** in `.env.local`, `.env`, and Vercel points to `ep-gentle-moon-ahp5x11a-pooler` (the production data branch).

### Protection rules

Protected branches CANNOT be:
- Deleted (not by users, not by integrations, not by API)
- Reset from parent
- Archived due to inactivity

Projects with protected branches CANNOT be deleted.

## Daily backup system

### GitHub Action: `.github/workflows/db-backup.yml`

- **Schedule:** Every day at 06:00 UTC (03:00 Argentina)
- **Manual trigger:** Actions > Daily Database Backup > Run workflow
- **Process:** `pg_dump` → gzip → upload to R2 + GitHub artifact
- **R2 path:** `s3://hubents-uploads/backups/db/hubents-backup-YYYYMMDD-HHMMSS.sql.gz`
- **Retention:** 30 backups in R2 (auto-cleanup), 30 days in GitHub artifacts

### GitHub Secrets required

| Secret | Value |
|--------|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:...@ep-gentle-moon-ahp5x11a-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_BUCKET_NAME` | `hubents-uploads` |

### Restoring from backup

```bash
# Download backup from R2
aws s3 cp s3://hubents-uploads/backups/db/hubents-backup-YYYYMMDD-HHMMSS.sql.gz ./backup.sql.gz \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" --region auto

# Decompress
gunzip backup.sql.gz

# Restore to a Neon branch
psql "$DATABASE_URL" < backup.sql
```

## Connecting integrations safely

### BEFORE connecting ANY integration to Neon:

1. Verify the target branch is **PROTECTED** in Neon Console (shield icon)
2. Take a manual backup: Actions > Daily Database Backup > Run workflow
3. Note the current `DATABASE_URL` endpoint for rollback
4. Connect the integration
5. Verify `DATABASE_URL` was not changed
6. Verify no branches were deleted: `neonctl branches list --project-id late-dream-83661145`

### Neon-Vercel integration behavior (WARNING)

The Neon-Vercel marketplace integration can:
- Create new branches for preview/development environments
- **DELETE existing unprotected branches** (`delete_timeline`)
- Modify the `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in Vercel env vars
- Add `\r\n` to the end of environment variable values

This is what caused the 2026-03-31 incident.

## Incident: 2026-03-31 data loss

### What happened

On 2026-03-31 at 22:04:39 UTC, the first-time connection of the Neon-Vercel marketplace integration automatically executed `delete_timeline` on branch `br-little-surf-ahyce57i`, which contained all production data (61 organizations, 69 users, 105 events, 873 tasks, 649 contacts, 452 guests, 90 financial documents).

### Root cause

The integration deleted a child branch with active data and computes without warning or user confirmation. The root branch `production` was empty (data only lived on the child branch).

### Resolution

Neon engineering recovered the branch from internal storage and reinstated it as `vercel-dev-recovered`. Ticket #00883815.

### Actions taken

1. Upgraded to Neon Scale plan for priority support
2. Opened ticket #00883815 with full technical details
3. Rebuilt DB from scratch as interim solution (drizzle-kit push + seeds)
4. Protected both branches after recovery
5. Set history retention to 30 days
6. Created daily backup GitHub Action
7. Updated all documentation, rules, and skills
8. ClickUp incident ticket: 86agmqjf2

## Disaster recovery: full rebuild from scratch

If the DB needs to be rebuilt completely (all data lost):

```powershell
# 1. Fix DATABASE_URL in .env, .env.local, Vercel
# 2. Create schema
npx drizzle-kit push

# 3. Seed roles (creates legacy names)
$env:DATABASE_URL = "postgresql://..."
npx tsx src/db/seed-roles.ts

# 4. Migrate to unified role names
npx tsx scripts/migrate-provider-roles.ts

# 5. Reset permissions to canonical mapping
npx tsx scripts/hard-reset-permissions.ts

# 6. Seed plans and feature flags
npx tsx scripts/seed-plans.ts

# 7. Sync Stripe products/prices
npx tsx scripts/sync-stripe-products.ts

# 8. Create super admin
npx tsx scripts/create-admin.ts

# 9. Seed templates (optional)
npx tsx scripts/seed-wedding-template.ts
npx tsx scripts/seed-all-templates.ts

# 10. Delete residual vendor/member roles
# (SQL: DELETE FROM roles WHERE slug IN ('vendor','member') AND organization_id IS NULL)

# 11. Audit
npx tsx scripts/full-audit.ts

# 12. Protect the branch
# (API or Neon Console: set protected=true)
```

## Useful commands

```powershell
# List branches
neonctl branches list --project-id late-dream-83661145

# Get connection string for a branch
neonctl connection-string --project-id late-dream-83661145 --branch br-little-surf-ahyce57i

# Verify history retention
neonctl projects list --project-id late-dream-83661145 --output json
# Look for history_retention_seconds: 2592000

# Protect a branch via API
$token = (Get-Content "$env:USERPROFILE\.config\neonctl\credentials.json" | ConvertFrom-Json).access_token
$body = '{"branch":{"protected":true}}'
Invoke-RestMethod -Uri "https://console.neon.tech/api/v2/projects/late-dream-83661145/branches/BRANCH_ID" `
  -Method Patch -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"} -Body $body

# Manual backup trigger
# GitHub > Actions > Daily Database Backup > Run workflow
```

## Related

- `hubents-database-migration` skill — schema changes and migration workflow
- `hubents-deploy` skill — pre-deploy checks and post-deploy verification
- `.cursor/rules/hubents-project-architecture.mdc` — Neon section
- `.cursor/rules/hubents-workflow-skills.mdc` — data protection section
- `AGENTS.md` — data protection section
- ClickUp ticket: [86agmqjf2](https://app.clickup.com/t/86agmqjf2)
- Neon ticket: #00883815

## Source

Created from the 2026-03-31 incident. No Windsurf equivalent exists yet.
