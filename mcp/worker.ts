import { createMcpHandler } from "agents/mcp/server";
import { authenticateBearer, loadTokenRecords } from "./auth";
import { createCloudflareRenderer } from "./cloudflare-renderer";
import { buildServer } from "./server";

interface Env extends McpWorkerEnv {
  NOCANVA_APP_TOKEN: string;
  NOCANVA_SITES_BYPASS_TOKEN: string;
  NOCANVA_MCP_TOKEN?: string;
  NOCANVA_MCP_TOKENS?: string;
}

function json(status: number, value: Record<string, unknown>, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

async function applicationHealth(env: Env) {
  try {
    const response = await fetch(new URL("/api/health", env.NOCANVA_BASE_URL), {
      headers: {
        authorization: `Bearer ${env.NOCANVA_APP_TOKEN}`,
        "oai-sites-authorization": `Bearer ${env.NOCANVA_SITES_BYPASS_TOKEN}`,
      },
    });
    return { reachable: response.ok, status: response.status };
  } catch (error) {
    return { reachable: false, error: error instanceof Error ? error.message : "Unknown application health error." };
  }
}

async function authenticateManagedToken(authorization: string | null, env: Env) {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1].startsWith("ncv_")) return null;
  const response = await fetch(new URL("/api/internal/mcp/auth", env.NOCANVA_BASE_URL), {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.NOCANVA_APP_TOKEN}`,
      "content-type": "application/json",
      "oai-sites-authorization": `Bearer ${env.NOCANVA_SITES_BYPASS_TOKEN}`,
    },
    body: JSON.stringify({ token: match[1] }),
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Managed token validation failed with status ${response.status}.`);
  const value = await response.json() as { principal?: { id?: unknown; workspaceId?: unknown } };
  if (!value.principal || typeof value.principal.id !== "string" || typeof value.principal.workspaceId !== "string") throw new Error("Managed token validation returned an invalid principal.");
  return { id: value.principal.id, workspaceId: value.principal.workspaceId, revokedAt: null };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") {
      const application = await applicationHealth(env);
      return json(application.reachable ? 200 : 503, {
        status: application.reachable ? "ok" : "degraded",
        transport: "streamable-http",
        renderer: "cloudflare-browser-rendering",
        application,
      });
    }

    let principal = null;
    try {
      const tokens = loadTokenRecords({
        NOCANVA_MCP_TOKEN: env.NOCANVA_MCP_TOKEN,
        NOCANVA_MCP_TOKENS: env.NOCANVA_MCP_TOKENS,
      });
      principal = authenticateBearer(request.headers.get("authorization") ?? undefined, tokens);
    } catch (error) {
      console.error(JSON.stringify({ event: "token_configuration_error", error: error instanceof Error ? error.message : "Unknown error" }));
    }
    if (!principal) {
      try {
        principal = await authenticateManagedToken(request.headers.get("authorization"), env);
      } catch (error) {
        console.error(JSON.stringify({ event: "managed_token_validation_error", error: error instanceof Error ? error.message : "Unknown error" }));
        return json(503, { error: "NoCanva MCP authentication is temporarily unavailable." });
      }
    }

    if (!principal) {
      return json(401, { error: "A valid NoCanva bearer token is required." }, { "www-authenticate": 'Bearer realm="nocanva-mcp"' });
    }

    if (url.pathname === "/diagnostics") {
      const application = await applicationHealth(env);
      return json(application.reachable ? 200 : 503, {
        status: application.reachable ? "ready" : "degraded",
        transport: "streamable-http",
        renderer: "cloudflare-browser-rendering",
        workspaceId: principal.workspaceId,
        tokenId: principal.id,
        application,
      });
    }

    if (url.pathname !== "/mcp") return json(404, { error: "Not found." });
    if (request.method === "POST" && Number(request.headers.get("content-length") ?? 0) > 1_000_000) {
      return json(413, { error: "MCP request body exceeds the 1 MB limit." });
    }

    const handler = createMcpHandler(() => buildServer(env.NOCANVA_BASE_URL, {
      workspaceId: principal.workspaceId,
      actor: `agent:${principal.id}`,
      serviceToken: env.NOCANVA_APP_TOKEN,
      siteBypassToken: env.NOCANVA_SITES_BYPASS_TOKEN,
      allowRemote: true,
      render: createCloudflareRenderer(env.BROWSER),
      renderTimeoutMs: 45_000,
    }), {
      route: "/mcp",
      legacy: "stateless",
      responseMode: "auto",
      onerror: (error) => console.error(JSON.stringify({
        event: "mcp_error",
        tokenId: principal.id,
        workspaceId: principal.workspaceId,
        error: error.message,
      })),
    });
    return handler(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
