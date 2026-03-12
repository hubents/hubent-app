---
description: How to update the API changelog when adding new features or making changes to the public API
---

# API Changelog Update Workflow

## When to run this workflow
Run this workflow every time you add, modify, or remove something from the public API (`/api/v1`).

## Steps

1. **Identify the change type** — Is it a new endpoint, new scope, new webhook event, breaking change, fix, or deprecation?

2. **Update the changelog page** at `src/app/developers/changelog/page.tsx`:
   - Find the `CHANGELOG` array at the top of the file
   - If it's a backwards-compatible change, add to the `changes[]` of the current (first) release
   - If it's a breaking change, add a NEW release entry at the top with `current: true` and set the old one to `current: false`
   - Use the correct `type`: `added`, `changed`, `deprecated`, `removed`, `fixed`, `security`

3. **Update OpenAPI spec** if needed — `src/lib/api/openapi-spec.ts`:
   - Add new path definitions for new endpoints
   - Add new schemas for new entities
   - Add new tags if it's a new entity group

4. **Update MCP tools** if needed — `src/lib/api/mcp-server.ts`:
   - Add new tool definition to `MCP_TOOLS` array
   - Add mapping in `MCP_TOOL_MAPPINGS`

5. **Update webhook events** if needed — `src/lib/api/api-webhooks.ts`:
   - Add new event type to `WEBHOOK_EVENT_TYPES`

6. **Update scopes** if needed — `src/lib/api/api-auth.ts`:
   - Add new scope to `ALL_SCOPES`
   - If applicable, add to `PROVIDER_ALLOWED_SCOPES`
   - Update `SCOPE_GROUPS` in `src/app/dashboard/settings/developers/page.tsx`

7. **Update feature flags** if needed — `src/lib/api/api-feature-flags.ts`:
   - Add new feature flag if the feature is plan-gated

8. **Update README** if the change is significant — `README.md`

9. **Run tests** to verify nothing broke:
   ```
   // turbo
   npx vitest run src/__tests__/api/
   ```

10. **Commit with descriptive message** following the pattern:
    ```
    feat(api): add [endpoint/feature description]
    ```
