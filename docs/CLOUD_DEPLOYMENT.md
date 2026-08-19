# NoCanva Cloud deployment gate

NoCanva Cloud must remain private until every gate below passes.

## Application boundary

- Set `NOCANVA_AUTH_MODE=sites_private` on the application.
- Store an independent random `NOCANVA_APP_TOKEN` as an application and MCP-sidecar secret.
- Store agent-facing MCP tokens separately in `NOCANVA_MCP_TOKENS`.
- Deploy the Sites application privately so browser routes receive authenticated-user headers.
- Expose only the TLS-protected MCP `/mcp` route from the sidecar. Keep the application origin private where the platform permits it.

In hosted mode, anonymous API and page requests fail closed. Sites users are attributed from the platform user ID. The MCP sidecar authenticates the external bearer token, then forwards only its trusted token ID and workspace through the internal application credential.

## Workspace isolation

Every brand, template, template version, draft, revision, review, approval, post, render, and event row carries `workspace_id`. Repository reads and writes require the authenticated workspace, reusable slug IDs are physically namespaced, and immutable R2 objects live below `workspaces/<workspace-id>/renders/`.

The release fixture must use two workspaces in one database and prove:

- the same logical brand or template ID can exist independently in both workspaces;
- list operations return only the caller's records;
- cross-workspace draft reads and updates fail;
- cross-workspace render metadata and PNG asset reads return not found.

The 2026-08-20 container contract passed all of those checks. Repeat it against the private cloud deployment before release.

## Current private Sites project

The existing Sites project remains in custom owner-only access mode. Its display name is NoCanva. Do not deploy the Sprint 2B source until hosted environment variables, the D1 migration, and the remote MCP sidecar are configured; the previous live version does not represent the release candidate.

## Release checks

1. Run build, lint, TypeScript, unit, stdio MCP, draft lifecycle, and authenticated HTTP MCP suites.
2. Prove anonymous application API requests return `401` in hosted mode.
3. Prove an authenticated MCP token cannot read another workspace's IDs or assets.
4. Prove the exact render hash survives backup and restore.
5. Deploy privately and run the HTTP MCP fixture against the deployed endpoint.
