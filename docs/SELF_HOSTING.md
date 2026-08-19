# Self-host NoCanva

## Two-minute setup

Requirements: Docker Desktop or Docker Engine with Compose.

```bash
npm run self-host
```

The bootstrap creates `.env.self-host` with independent random 256-bit MCP and application service tokens, builds both services, and starts:

- NoCanva workspace: `http://localhost:3000`
- Authenticated Streamable HTTP MCP: `http://localhost:3100/mcp`
- MCP health: `http://localhost:3100/healthz`
- Authenticated diagnostics: `http://localhost:3100/diagnostics`

Display and export the generated token:

```bash
export NOCANVA_MCP_TOKEN="$(npm run --silent self-host:token)"
```

### Connect Codex

```bash
codex mcp add nocanva --url http://localhost:3100/mcp --bearer-token-env-var NOCANVA_MCP_TOKEN
```

Codex supports Streamable HTTP server URLs and bearer tokens sourced from an environment variable, as documented in the [official MCP configuration guide](https://learn.chatgpt.com/docs/extend/mcp?surface=cli). Restart the client or open a new task after adding the server.

### Connect Claude Code

```bash
claude mcp add --transport http --scope project nocanva http://localhost:3100/mcp --header "Authorization: Bearer $NOCANVA_MCP_TOKEN"
```

Add `@AGENTS.md` to the target repository's `CLAUDE.md` so Claude Code imports the bundled workflow. Codex discovers a root `AGENTS.md` automatically.

## Local stdio development

Keep the web app running with `npm run dev`, then connect without opening an HTTP port:

```bash
codex mcp add nocanva --env NOCANVA_BASE_URL=http://localhost:3000 -- npm --prefix "$PWD" run mcp:dev
claude mcp add --scope project -e NOCANVA_BASE_URL=http://localhost:3000 nocanva -- npm --prefix "$PWD" run mcp:dev
```

## Remote deployment

The Compose defaults bind both ports to loopback. For remote MCP, place TLS at a reverse proxy or platform edge, set `NOCANVA_MCP_BIND_IP=0.0.0.0`, and expose only the MCP `/mcp` route. Set a unique `NOCANVA_MCP_TOKEN`; never reuse the bootstrap token between installations.

Local self-hosting defaults to `NOCANVA_AUTH_MODE=disabled` and binds the workspace to loopback. Keep port 3000 on a trusted network; do not expose an auth-disabled workspace directly to the public internet.

Hosted private Sites deployments use `NOCANVA_AUTH_MODE=sites_private`. Browser requests require the Sites-authenticated user headers, while the MCP sidecar reaches the application with `NOCANVA_APP_TOKEN`. The sidecar forwards its authenticated token identity and workspace as trusted internal context. Never expose or reuse the application service token as an agent-facing MCP token.

For multiple workspaces or revocation, replace the single token with `NOCANVA_MCP_TOKENS`, a JSON array:

```json
[
  { "id": "agent-a", "token": "at-least-24-characters-long", "workspaceId": "team-a" },
  { "id": "revoked-agent", "token": "another-long-secret-token", "workspaceId": "team-a", "revokedAt": "2026-08-19T00:00:00Z" }
]
```

Every request is attributed to the token ID and workspace ID in structured JSON logs. The default limit is 120 requests per token per minute; override it with `NOCANVA_MCP_RATE_LIMIT`.

Rendering has a 45-second browser timeout by default. Override `NOCANVA_RENDER_TIMEOUT_MS` for unusually constrained hosts.

## Storage model

The open-source stack uses project-local SQLite and filesystem-backed object storage through the D1/R2-compatible Miniflare bindings. The application service contract is unchanged when those bindings are replaced by managed Cloudflare D1 and R2 resources. No embedded NoCanva LLM or provider API is required.

The container runs the built Worker with Wrangler's local runtime so `cloudflare:workers`, D1, and R2 behave the same way as the managed adapters. `npm start` remains the plain vinext server and is not the self-host entrypoint; use `npm run start:self-host` when starting the built local stack without Compose.
