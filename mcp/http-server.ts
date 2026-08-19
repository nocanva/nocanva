import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { authenticateBearer, loadTokenRecords, type McpPrincipal } from "./auth";
import { buildServer } from "./server";
import { renderWithLocalPlaywright } from "./node-renderer";

const port = Number(process.env.NOCANVA_MCP_PORT ?? 3100);
const hostname = process.env.NOCANVA_MCP_HOST ?? "0.0.0.0";
const appBaseUrl = process.env.NOCANVA_BASE_URL ?? "http://localhost:3000";
const tokens = loadTokenRecords();
const rateLimit = Number(process.env.NOCANVA_MCP_RATE_LIMIT ?? 120);
const windows = new Map<string, { startedAt: number; count: number }>();

const handlers = new Map<string, { handler: ReturnType<typeof createMcpHandler>; nodeHandler: ReturnType<typeof toNodeHandler> }>();

function handlerFor(actor: McpPrincipal) {
  const existing = handlers.get(actor.id);
  if (existing) return existing;
  const handler = createMcpHandler(() => buildServer(appBaseUrl, {
    workspaceId: actor.workspaceId,
    actor: `agent:${actor.id}`,
    serviceToken: process.env.NOCANVA_APP_TOKEN,
    render: renderWithLocalPlaywright,
  }), {
    legacy: "stateless",
    responseMode: "auto",
    onerror: (error) => log("mcp_error", { tokenId: actor.id, workspaceId: actor.workspaceId, error: error.message }),
  });
  const created = { handler, nodeHandler: toNodeHandler(handler) };
  handlers.set(actor.id, created);
  return created;
}

function log(event: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: "nocanva-mcp", event, ...fields }));
}

function json(res: ServerResponse, status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}

function principal(req: IncomingMessage): McpPrincipal | null {
  return authenticateBearer(req.headers.authorization, tokens);
}

function withinRateLimit(actor: McpPrincipal) {
  const now = Date.now();
  const current = windows.get(actor.id);
  if (!current || now - current.startedAt >= 60_000) {
    windows.set(actor.id, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= rateLimit;
}

async function appHealth() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(new URL("/api/health", appBaseUrl), { signal: controller.signal });
    return { reachable: response.ok, status: response.status };
  } catch (error) {
    return { reachable: false, error: error instanceof Error ? error.message : "Unknown application health error." };
  } finally {
    clearTimeout(timer);
  }
}

const server = createServer(async (req, res) => {
  const startedAt = Date.now();
  const requestId = req.headers["x-request-id"]?.toString() ?? crypto.randomUUID();
  res.setHeader("x-request-id", requestId);
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/healthz") {
    const application = await appHealth();
    json(res, application.reachable ? 200 : 503, { status: application.reachable ? "ok" : "degraded", transport: "streamable-http", application });
    return;
  }

  const actor = principal(req);
  if (!actor) {
    json(res, 401, { error: "A valid NoCanva bearer token is required." }, { "www-authenticate": 'Bearer realm="nocanva-mcp"' });
    log("authentication_failed", { requestId, path: url.pathname });
    return;
  }
  if (!withinRateLimit(actor)) {
    json(res, 429, { error: "NoCanva MCP rate limit exceeded." }, { "retry-after": "60" });
    log("rate_limited", { requestId, tokenId: actor.id, workspaceId: actor.workspaceId });
    return;
  }

  if (url.pathname === "/diagnostics") {
    const application = await appHealth();
    json(res, application.reachable ? 200 : 503, {
      status: application.reachable ? "ready" : "degraded",
      transport: "streamable-http",
      workspaceId: actor.workspaceId,
      tokenId: actor.id,
      appBaseUrl,
      application,
    });
    return;
  }

  if (url.pathname !== "/mcp") {
    json(res, 404, { error: "Not found." });
    return;
  }

  try {
    await handlerFor(actor).nodeHandler(req, res);
    log("mcp_request", { requestId, tokenId: actor.id, workspaceId: actor.workspaceId, method: req.method, durationMs: Date.now() - startedAt });
  } catch (error) {
    if (!res.headersSent) json(res, 500, { error: "The MCP request failed." });
    log("mcp_request_failed", { requestId, tokenId: actor.id, workspaceId: actor.workspaceId, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : "Unknown MCP error." });
  }
});

server.listen(port, hostname, () => {
  log("started", { hostname, port, appBaseUrl, tokenRecords: tokens.length, rateLimit });
});

async function shutdown(signal: string) {
  log("stopping", { signal });
  server.close();
  await Promise.all(Array.from(handlers.values(), ({ handler }) => handler.close()));
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
