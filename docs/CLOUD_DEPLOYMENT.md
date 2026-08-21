# NoCanva Cloud deployment gate

NoCanva Cloud must remain private until every gate below passes.

## Application boundary

- Set `NOCANVA_AUTH_MODE=cloudflare_access` for a Worker protected by Cloudflare Access. Keep `sites_private` only for ChatGPT Sites hosting.
- Set `NOCANVA_ACCESS_TEAM_DOMAIN` and `NOCANVA_ACCESS_AUD` from the Access application. Hostname-based Access JWTs are verified against the team JWKS before identity headers are injected.
- Store an independent random `NOCANVA_APP_TOKEN` as an application and MCP Worker secret.
- Store agent-facing MCP tokens separately in `NOCANVA_MCP_TOKENS`.
- Store the Sites dispatch credential only as `NOCANVA_SITES_BYPASS_TOKEN` on the MCP Worker.
- Protect the application Worker with an Access allow policy. The Worker reads the verified identity from `ctx.access`, strips spoofable inbound identity headers, and forwards only trusted identity fields to the application router.
- Expose only the TLS-protected MCP `/mcp` route from the sidecar. Keep the application origin private where the platform permits it.

In hosted mode, anonymous API and page requests fail closed. Cloudflare Access users are attributed from the verified Access identity; Sites users remain supported on ChatGPT Sites deployments. The MCP Worker authenticates the external bearer token, then forwards only its trusted token ID and workspace through the internal application credential. Hosted screenshots use the Cloudflare Browser Rendering binding; the application itself still makes no LLM calls.

## Workspace isolation

Every brand, template, template version, draft, revision, review, approval, post, render, and event row carries `workspace_id`. Repository reads and writes require the authenticated workspace, reusable slug IDs are physically namespaced, and immutable R2 objects live below `workspaces/<workspace-id>/renders/`.

The release fixture must use two workspaces in one database and prove:

- the same logical brand or template ID can exist independently in both workspaces;
- list operations return only the caller's records;
- cross-workspace draft reads and updates fail;
- cross-workspace render metadata and PNG asset reads return not found.

The 2026-08-20 container contract passed all of those checks. Repeat it against the private cloud deployment before release.

## Managed free-tier topology

The application remains in its owner-only Sites project and uses the Sites-managed D1 and R2 bindings. `nocanva-mcp` is a separate Workers Free script with a Browser Rendering binding. It exposes `/mcp`, `/healthz`, and authenticated `/diagnostics`; it does not use Containers. Cloudflare Free-plan platform limits stop excess Worker or browser usage instead of requiring application-side billing.

## Release checks

1. Run build, lint, TypeScript, unit, stdio MCP, draft lifecycle, and authenticated HTTP MCP suites.
2. Prove anonymous application API requests return `401` in hosted mode.
3. Prove an authenticated MCP token cannot read another workspace's IDs or assets.
4. Prove the exact render hash survives backup and restore.
5. Deploy privately and run the authenticated MCP draft lifecycle against the Worker endpoint.
