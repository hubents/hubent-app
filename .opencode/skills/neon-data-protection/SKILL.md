---
name: neon-data-protection
description: Neon branch protection, GitHub Action backups, disaster recovery, and the 2026-03-31 incident where the Neon-Vercel integration deleted a production data branch. Use when working with Neon branches, connecting integrations, managing backups, or recovering from data loss.
metadata:
  audience: agents
  workflow: data-protection
---

# Neon Data Protection & Backup

> **Fuente única de verdad:** `.cursor/skills/neon-data-protection/SKILL.md`
> Espejo OpenCode — sincronizar ambos al editar.

## Cuándo usar este skill

- Conectar o modificar integraciones Neon (Vercel, GitHub, etc.)
- Gestionar branches Neon (create, protect, delete)
- Configurar o debuggear backups
- Recuperar de pérdida o corrupción de datos
- Revisar seguridad de infraestructura DB

## Infraestructura actual

### Proyecto Neon

- **Project:** `late-dream-83661145` (hubents-app)
- **Org:** NapsixAI (`org-dry-water-28955192`)
- **Plan:** Scale (priority support, hasta 5 protected branches)
- **Region:** `aws-us-east-1` (c-3)
- **History retention:** 30 días (2592000 s)

### Branches (2 totales, AMBAS PROTEGIDAS)

| Branch | ID | Endpoint (pooler) | Rol |
|--------|----|-------------------|-----|
| `vercel-dev-recovered` | `br-little-surf-ahyce57i` | `ep-gentle-moon-ahp5x11a-pooler.c-3.us-east-1.aws.neon.tech` | Producción |
| `production` | `br-noisy-band-ahvj6vrk` | `ep-floral-sea-ahusfae7-pooler.c-3.us-east-1.aws.neon.tech` | Backup emergencia |

`DATABASE_URL` en `.env.local`, `.env` y Vercel apunta a `ep-gentle-moon-ahp5x11a-pooler`.

### Reglas de protección

Branches protegidas NO pueden ser:
- Eliminadas (ni usuarios, ni integraciones, ni API)
- Reseteadas desde parent
- Archivadas por inactividad

Proyectos con branches protegidas no pueden eliminarse.

## Sistema de backup diario

### GitHub Action: `.github/workflows/db-backup.yml`

- **Schedule:** Diario 06:00 UTC (03:00 Argentina)
- **Manual:** Actions > Daily Database Backup > Run workflow
- **Proceso:** `pg_dump` → gzip → upload R2 + GitHub artifact
- **Path R2:** `s3://hubents-uploads/backups/db/hubents-backup-YYYYMMDD-HHMMSS.sql.gz`
- **Retención:** 30 backups en R2 (auto-cleanup), 30 días en artifacts

### GitHub Secrets

| Secret | Valor |
|--------|-------|
| `DATABASE_URL` | pooler `ep-gentle-moon-ahp5x11a-pooler.c-3...` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret |
| `R2_ACCOUNT_ID` | Cloudflare account |
| `R2_BUCKET_NAME` | `hubents-uploads` |

### Restore desde backup

```bash
aws s3 cp s3://hubents-uploads/backups/db/hubents-backup-YYYYMMDD-HHMMSS.sql.gz ./backup.sql.gz \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" --region auto

gunzip backup.sql.gz
psql "$DATABASE_URL" < backup.sql
```

## Conectar integraciones de forma segura

ANTES de conectar CUALQUIER integración a Neon:

1. Verificar que la branch destino esté **PROTEGIDA** (escudo en Neon Console)
2. Backup manual: Actions > Daily Database Backup > Run workflow
3. Anotar `DATABASE_URL` actual para rollback
4. Conectar integración
5. Verificar que `DATABASE_URL` no cambió
6. Verificar que ninguna branch fue eliminada: `neonctl branches list --project-id late-dream-83661145`

### Neon-Vercel integration (WARNING)

La integración marketplace puede:
- Crear branches nuevas para preview/dev
- **BORRAR branches existentes no protegidas** (`delete_timeline`)
- Modificar `DATABASE_URL` y `DATABASE_URL_UNPOOLED` en Vercel env
- Agregar `\r\n` al final de valores de env vars

Esto causó el incidente del 2026-03-31.

## Incidente 2026-03-31

El 2026-03-31 22:04:39 UTC, la primera conexión de la integración Neon-Vercel ejecutó `delete_timeline` automáticamente en la branch `br-little-surf-ahyce57i`, que contenía toda la data productiva (61 orgs, 69 users, 105 events, 873 tasks, 649 contacts, 452 guests, 90 documentos financieros).

**Causa raíz:** la integración borró una child branch con datos activos sin warning ni confirmación. La root `production` estaba vacía.

**Resolución:** Neon engineering recuperó la branch desde almacenamiento interno, reinstaurada como `vercel-dev-recovered`. Ticket #00883815. ClickUp: `86agmqjf2`.

**Acciones tomadas:**
1. Upgrade a Neon Scale para priority support
2. Ticket técnico abierto
3. Rebuild interino (drizzle-kit push + seeds)
4. Ambas branches protegidas tras recovery
5. History retention 30 días
6. GitHub Action diaria
7. Documentación, rules y skills actualizados

## Disaster recovery (rebuild completo)

Si la DB necesita reconstruirse desde cero, ver skill `hubents-database-migration` (12 pasos).

## Comandos útiles

```powershell
# Listar branches
neonctl branches list --project-id late-dream-83661145

# Connection string
neonctl connection-string --project-id late-dream-83661145 --branch br-little-surf-ahyce57i

# Verificar history retention
neonctl projects list --project-id late-dream-83661145 --output json

# Proteger branch via API
$token = (Get-Content "$env:USERPROFILE\.config\neonctl\credentials.json" | ConvertFrom-Json).access_token
$body = '{"branch":{"protected":true}}'
Invoke-RestMethod -Uri "https://console.neon.tech/api/v2/projects/late-dream-83661145/branches/BRANCH_ID" `
  -Method Patch -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"} -Body $body

# Manual backup → GitHub Actions UI
```

## Related

- Skill `hubents-database-migration` — schema y workflow
- Skill `hubents-deploy` — pre-deploy checks e infra check post-deploy
- Rule `.cursor/rules/hubents-project-architecture.mdc` — sección Neon
- ClickUp `86agmqjf2`, Neon ticket `#00883815`
