# Partners migration — hard audit checklist (Marketplace → Partners)

Use this after changes to routing, sidebar, or copy. Automated coverage: `src/__tests__/config/partners-routing.test.ts`, `src/__tests__/api/provider-directory-integration.test.ts`.

## Plan cross-check (gaps closed)

| Step | Check | Status |
|------|--------|--------|
| Route | `src/app/dashboard/partners/page.tsx` exists | Automated |
| Redirect | `next.config.ts` → `/dashboard/marketplace` → `/dashboard/partners` permanent | Automated |
| Sidebar key | `tenant-types.ts` `sidebarSections` contains `"partners"` (not `"marketplace"`) | Automated |
| Main sidebar | Label `Partners`, `href` `/dashboard/partners`, `hasSection("partners")` | Automated |
| UI title | Page H1 `Partners HubEnts` | Automated |
| Integrations | Composio tab still named **Marketplace** (intentional — not HubEnts directory) | Manual |
| API contract | `isMarketplaceVisible` / `canBrowseMarketplace` unchanged | N/A UI |

## UI implementation (manual E2E smoke)

Run logged in as planner (tenant) and provider.

1. **Sidebar:** Entry **Partners** visible (desktop); navigates to `/dashboard/partners`.
2. **Redirect:** Open `/dashboard/marketplace` → lands on `/dashboard/partners` (308).
3. **Partners page:** Heading **Partners HubEnts**; list/cards load; view toggle persists (`partners-view` / legacy `marketplace-view`).
4. **Event → Proveedores:** Button **Partners** → `/dashboard/partners`; drawer copy **Partners HubEnts**, placeholder “Buscar en Partners…”.
5. **Collaborator drawer (vendors):** Section **Partners HubEnts**; search placeholder consistent.
6. **Tasks → Agregar participante:** Filter **Partners**; section **PARTNERS HUBENTS**.
7. **/dashboard/providers:** H1 **Partners** (directory alternate entry).
8. **Public profile / onboarding / register:** Copy references **Partners** / **Partners HubEnts** where applicable.
9. **Integraciones → pestaña Marketplace:** Still **Marketplace** (Composio apps).

## Commands (pre-deploy)

```powershell
pnpm exec tsc --noEmit --pretty
pnpm exec vitest run
```

Optional (repo policy): no `console.log` under `src/app/api/` — see deploy skill.

## Post-deploy smoke (production)

From `hubents-deploy` skill: terms/privacy, register flows, 404, toasts; plus **open `/dashboard/partners` and `/dashboard/marketplace` redirect**.
