import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { authenticateBearer, loadTokenRecords } from "../mcp/auth.ts";

test("remote MCP tokens are scoped, revocable, and fail closed", () => {
  const records = loadTokenRecords({
    NOCANVA_MCP_TOKENS: JSON.stringify([
      { id: "active", token: "active-token-01234567890123456789", workspaceId: "workspace-a" },
      { id: "revoked", token: "revoked-token-012345678901234567", workspaceId: "workspace-a", revokedAt: "2026-08-19T00:00:00Z" },
    ]),
  });
  assert.deepEqual(authenticateBearer("Bearer active-token-01234567890123456789", records), { id: "active", workspaceId: "workspace-a", revokedAt: null });
  assert.equal(authenticateBearer("Bearer revoked-token-012345678901234567", records), null);
  assert.equal(authenticateBearer("Bearer incorrect-token-012345678901234", records), null);
  assert.throws(() => loadTokenRecords({ NOCANVA_MCP_TOKEN: "short" }), /at least 24 characters/);
});

test("a bootstrap token can be added without replacing managed token records", () => {
  const records = loadTokenRecords({
    NOCANVA_MCP_TOKENS: JSON.stringify([
      { id: "existing", token: "existing-token-012345678901234567", workspaceId: "default" },
    ]),
    NOCANVA_MCP_TOKEN: "blindspot-token-012345678901234567",
    NOCANVA_WORKSPACE_ID: "default",
  });
  assert.deepEqual(records.map(({ id, workspaceId }) => ({ id, workspaceId })), [
    { id: "existing", workspaceId: "default" },
    { id: "self-host", workspaceId: "default" },
  ]);
});

test("self-host package keeps the MCP sidecar authenticated and persistent", async () => {
  const [compose, dockerfile, server, guide] = await Promise.all([
    readFile(new URL("../docker-compose.yml", import.meta.url), "utf8"),
    readFile(new URL("../Dockerfile", import.meta.url), "utf8"),
    readFile(new URL("../mcp/http-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/SELF_HOSTING.md", import.meta.url), "utf8"),
  ]);
  assert.match(compose, /NOCANVA_MCP_TOKEN:\s+\$\{NOCANVA_MCP_TOKEN:\?/);
  assert.match(compose, /NOCANVA_APP_TOKEN/);
  assert.match(compose, /nocanva_data:\/app\/\.wrangler/);
  assert.match(dockerfile, /mcr\.microsoft\.com\/playwright/);
  assert.match(server, /authenticateBearer/);
  assert.match(server, /handlerFor\(actor\)/);
  assert.match(server, /rate_limited/);
  assert.match(guide, /codex mcp add nocanva --url/);
  assert.match(guide, /claude mcp add --transport http/);
});

test("managed hosted tokens are hashed, revocable, and validated by the app boundary", async () => {
  const [repository, worker, route] = await Promise.all([
    readFile(new URL("../lib/server/media-repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../mcp/worker.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/internal/mcp/auth/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(repository, /sha256Text\(token\)/);
  assert.doesNotMatch(repository, /INSERT INTO mcp_tokens[^\n]*\btoken\b,/);
  assert.match(repository, /revoked_at IS NULL/);
  assert.match(worker, /\/api\/internal\/mcp\/auth/);
  assert.match(route, /principal\.kind !== "service"/);
});

test("hosted browser rendering uses the authenticated MCP render proxy", async () => {
  const [client, worker] = await Promise.all([
    readFile(new URL("../mcp/canvnah-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../mcp/worker.ts", import.meta.url), "utf8"),
  ]);
  assert.match(client, /renderBaseUrl/);
  assert.match(worker, /isRenderProxyPath/);
  assert.match(worker, /applicationProxyAuthorized/);
  assert.match(worker, /renderBaseUrl: url\.origin/);
});
