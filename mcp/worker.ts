import { createMcpHandler } from "agents/mcp/server";
import { createRemoteJWKSet, customFetch, jwtVerify, type JWTPayload } from "jose";
import { authenticateBearer, loadTokenRecords } from "./auth";
import { createCloudflareRenderer } from "./cloudflare-renderer";
import { buildServer } from "./server";

interface Env extends McpWorkerEnv {
  NOCANVA_APP: Fetcher;
  NOCANVA_APP_TOKEN: string;
  NOCANVA_SITES_BYPASS_TOKEN?: string;
  NOCANVA_MCP_TOKEN?: string;
  NOCANVA_MCP_TOKENS?: string;
  NOCANVA_AUTH_ISSUER: string;
  NOCANVA_MCP_RESOURCE: string;
}

const remoteKeySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function applicationRequest(env: Env, path: string, init?: RequestInit) {
  return env.NOCANVA_APP.fetch(new Request(new URL(path, "https://nocanva.internal"), init));
}

function applicationAuthHeaders(env: Env, init?: HeadersInit) {
  const headers = new Headers(init);
  headers.set("authorization", `Bearer ${env.NOCANVA_APP_TOKEN}`);
  if (env.NOCANVA_SITES_BYPASS_TOKEN) headers.set("oai-sites-authorization", `Bearer ${env.NOCANVA_SITES_BYPASS_TOKEN}`);
  return headers;
}

function isRenderProxyPath(pathname: string) {
  return pathname === "/render/preview"
    || pathname.startsWith("/assets/")
    || pathname.startsWith("/_next/")
    || pathname.startsWith("/_vinext/");
}

function applicationProxyAuthorized(request: Request, env: Env) {
  return Boolean(authenticateBearer(request.headers.get("authorization") ?? undefined, [{
    id: "render-proxy",
    token: env.NOCANVA_APP_TOKEN,
    workspaceId: "internal",
    revokedAt: null,
  }]));
}

function proxyRenderRequest(request: Request, env: Env, url: URL) {
  if (!applicationProxyAuthorized(request, env)) return json(401, { error: "Render proxy authentication is required." });
  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${env.NOCANVA_APP_TOKEN}`);
  if (env.NOCANVA_SITES_BYPASS_TOKEN) headers.set("oai-sites-authorization", `Bearer ${env.NOCANVA_SITES_BYPASS_TOKEN}`);
  else headers.delete("oai-sites-authorization");
  return applicationRequest(env, `${url.pathname}${url.search}`, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
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
    const response = await applicationRequest(env, "/api/health", {
      headers: applicationAuthHeaders(env),
    });
    return { reachable: response.ok, status: response.status };
  } catch (error) {
    return { reachable: false, error: error instanceof Error ? error.message : "Unknown application health error." };
  }
}

async function authenticateManagedToken(authorization: string | null, env: Env) {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1].startsWith("ncv_")) return null;
  const response = await applicationRequest(env, "/api/internal/mcp/auth", {
    method: "POST",
    headers: applicationAuthHeaders(env, { "content-type": "application/json" }),
    body: JSON.stringify({ token: match[1] }),
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Managed token validation failed with status ${response.status}.`);
  const value = await response.json() as { principal?: { id?: unknown; workspaceId?: unknown } };
  if (!value.principal || typeof value.principal.id !== "string" || typeof value.principal.workspaceId !== "string") throw new Error("Managed token validation returned an invalid principal.");
  return { id: value.principal.id, workspaceId: value.principal.workspaceId, revokedAt: null };
}

async function principalForOAuthUser(userId: string, env: Env) {
  const response = await applicationRequest(env, "/api/internal/mcp/oauth-principal", {
    method: "POST",
    headers: applicationAuthHeaders(env, { "content-type": "application/json" }),
    body: JSON.stringify({ userId }),
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`OAuth principal resolution failed with status ${response.status}.`);
  const value = await response.json() as { principal?: { id?: unknown; workspaceId?: unknown } };
  if (!value.principal || typeof value.principal.id !== "string" || typeof value.principal.workspaceId !== "string") throw new Error("OAuth principal resolution returned an invalid principal.");
  return { id: value.principal.id, workspaceId: value.principal.workspaceId, revokedAt: null };
}

function protectedResourceMetadata(env: Env) {
  return json(200, {
    resource: env.NOCANVA_MCP_RESOURCE,
    authorization_servers: [env.NOCANVA_AUTH_ISSUER],
    bearer_methods_supported: ["header"],
    scopes_supported: ["nocanva:read", "nocanva:write"],
  });
}

function oauthChallenge(env: Env, status = 401, error?: "invalid_token" | "insufficient_scope") {
  const metadataUrl = new URL("/.well-known/oauth-protected-resource/mcp", env.NOCANVA_MCP_RESOURCE).toString();
  const attributes = [`resource_metadata="${metadataUrl}"`, 'scope="nocanva:read nocanva:write"'];
  if (error) attributes.unshift(`error="${error}"`);
  return json(status, {
    jsonrpc: "2.0",
    error: { code: -32003, message: status === 403 ? "The token does not grant the required NoCanva scopes." : "NoCanva MCP authentication is required." },
    id: null,
  }, { "www-authenticate": `Bearer ${attributes.join(", ")}` });
}

async function authenticateOAuthRequest(request: Request, env: Env): Promise<JWTPayload | Response> {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1].startsWith("ncv_")) return oauthChallenge(env);
  const jwksUrl = `${env.NOCANVA_AUTH_ISSUER}/jwks`;
  let keySet = remoteKeySets.get(jwksUrl);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL(jwksUrl), {
      [customFetch]: (_url, init) => applicationRequest(env, "/api/auth/jwks", init),
    });
    remoteKeySets.set(jwksUrl, keySet);
  }
  try {
    const { payload } = await jwtVerify(match[1], keySet, {
      issuer: env.NOCANVA_AUTH_ISSUER,
      audience: env.NOCANVA_MCP_RESOURCE,
    });
    const scopes = new Set(typeof payload.scope === "string" ? payload.scope.split(/\s+/) : []);
    if (!scopes.has("nocanva:read") || !scopes.has("nocanva:write")) return oauthChallenge(env, 403, "insufficient_scope");
    return payload;
  } catch (error) {
    console.error(JSON.stringify({
      event: "oauth_token_verification_error",
      error: error instanceof Error ? error.message : "Unknown error",
      code: typeof error === "object" && error && "code" in error ? String(error.code) : undefined,
    }));
    return oauthChallenge(env, 401, "invalid_token");
  }
}

function mcpHandler(request: Request, env: Env, ctx: ExecutionContext, principal: { id: string; workspaceId: string }) {
  const url = new URL(request.url);
  if (url.pathname === "/diagnostics") {
    return applicationHealth(env).then((application) => json(application.reachable ? 200 : 503, {
      status: application.reachable ? "ready" : "degraded",
      transport: "streamable-http",
      renderer: "cloudflare-browser-rendering",
      workspaceId: principal.workspaceId,
      tokenId: principal.id,
      application,
    }));
  }
  if (url.pathname !== "/mcp") return json(404, { error: "Not found." });
  if (request.method === "POST" && Number(request.headers.get("content-length") ?? 0) > 15_000_000) return json(413, { error: "MCP request body exceeds the 15 MB limit." });

  const handler = createMcpHandler(() => buildServer(env.NOCANVA_BASE_URL, {
    workspaceId: principal.workspaceId,
    actor: `agent:${principal.id}`,
    serviceToken: env.NOCANVA_APP_TOKEN,
    siteBypassToken: env.NOCANVA_SITES_BYPASS_TOKEN,
    allowRemote: true,
    render: createCloudflareRenderer(env.BROWSER),
    renderBaseUrl: url.origin,
    renderTimeoutMs: 45_000,
    appFetcher: env.NOCANVA_APP,
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
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (isRenderProxyPath(url.pathname)) return proxyRenderRequest(request, env, url);
    if (url.pathname === "/.well-known/oauth-protected-resource" || url.pathname === "/.well-known/oauth-protected-resource/mcp") return protectedResourceMetadata(env);
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

    if (principal) return mcpHandler(request, env, ctx, principal);

    const claims = await authenticateOAuthRequest(request, env);
    if (claims instanceof Response) return claims;
    if (typeof claims.sub !== "string" || !claims.sub) return json(403, { error: "This OAuth token is not bound to a NoCanva user." });
    try {
      const oauthPrincipal = await principalForOAuthUser(claims.sub, env);
      if (!oauthPrincipal) return json(401, { error: "The NoCanva user for this token is unavailable." });
      return mcpHandler(request, env, ctx, oauthPrincipal);
    } catch (error) {
      console.error(JSON.stringify({ event: "oauth_principal_resolution_error", error: error instanceof Error ? error.message : "Unknown error" }));
      return json(503, { error: "NoCanva MCP authentication is temporarily unavailable." });
    }
  },
} satisfies ExportedHandler<Env>;
