---
name: hubents-api-changelog-update
description: >-
  Update HubEnts public API changelog, OpenAPI, MCP, webhooks, scopes, and
  feature flags when changing /api/v1. Use for new endpoints, breaking changes,
  deprecations, new scopes, webhook types, MCP tools, or developer-facing docs.
---

# HubEnts — API changelog update workflow

## When to use this skill

- Any change to the **public API** (`/api/v1`)
- New or removed endpoints, scopes, webhook events, MCP tools, rate limits, security fixes
- User says “changelog”, “OpenAPI”, “API version”, “X-HubEnts-Version”

## Before you finish

- Follow **date/version rules** in `.cursor/rules/hubents-api-changelog-dates.mdc`
- Follow **what to log** in `.cursor/rules/hubents-api-changelog.mdc`
- Update `CURRENT_API_VERSION` / `SUPPORTED_VERSIONS` in `src/lib/api/api-versioning.ts` when adding a new release entry

## Steps

### 1. Classify the change

New endpoint? Breaking change? New scope? Webhook type? MCP tool? Security fix? Deprecation?

### 2. Update changelog UI

File: `src/app/developers/changelog/page.tsx`

- Locate the `CHANGELOG` array
- **Backwards-compatible** → append to `changes[]` of the current (`current: true`) release
- **Breaking** → new release at top with `current: true`; set previous to `current: false`
- Use correct `type`: `added` | `changed` | `deprecated` | `removed` | `fixed` | `security`

### 3. OpenAPI spec (if needed)

`src/lib/api/openapi-spec.ts` — paths, schemas, tags

### 4. MCP tools (if needed)

`src/lib/api/mcp-server.ts` — `MCP_TOOLS`, `MCP_TOOL_MAPPINGS`

### 5. Webhook event types (if needed)

`src/lib/api/api-webhooks.ts` — `WEBHOOK_EVENT_TYPES`

### 6. Scopes (if needed)

- `src/lib/api/api-auth.ts` — `ALL_SCOPES`, `PROVIDER_ALLOWED_SCOPES`
- `src/app/dashboard/settings/developers/page.tsx` — `SCOPE_GROUPS`

### 7. Feature flags (if needed)

`src/lib/api/api-feature-flags.ts`

### 8. README (if significant)

`README.md`

### 9. Tests

```powershell
npx vitest run src/__tests__/api/
```

### 10. Commit message pattern

```text
feat(api): add [endpoint/feature description]
```

## Related project rules

- `.cursor/rules/hubents-api-changelog.mdc`
- `.cursor/rules/hubents-api-changelog-dates.mdc`

## See also (skills)

- `hubents-deploy` — run full checks and release after API changes

## Source

Derived from `.windsurf/workflows/api-changelog-update.md` (Windsurf copy unchanged).
