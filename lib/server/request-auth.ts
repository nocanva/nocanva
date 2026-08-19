import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { chatGPTSignInPath } from "../../app/chatgpt-auth";
import { resolvePrincipal, type NoCanvaPrincipal } from "./auth-policy";

type AuthorizationResult =
  | { ok: true; principal: NoCanvaPrincipal }
  | { ok: false; response: Response };

function authMode(): "disabled" | "sites_private" {
  return env.NOCANVA_AUTH_MODE === "sites_private" ? "sites_private" : "disabled";
}

export async function resolveNoCanvaPrincipal(requestHeaders: Headers): Promise<NoCanvaPrincipal | null> {
  return resolvePrincipal(requestHeaders, {
    mode: authMode(),
    workspaceId: env.NOCANVA_WORKSPACE_ID,
    serviceToken: env.NOCANVA_APP_TOKEN,
  });
}

export async function authorizeApi(request: Request): Promise<AuthorizationResult> {
  const principal = await resolveNoCanvaPrincipal(request.headers);
  if (principal) return { ok: true, principal };
  return {
    ok: false,
    response: Response.json(
      { error: "Authentication is required." },
      { status: 401, headers: { "cache-control": "no-store", "www-authenticate": 'Bearer realm="nocanva-app"' } },
    ),
  };
}

export async function requireNoCanvaViewer(returnTo = "/") {
  const principal = await resolveNoCanvaPrincipal(await headers());
  if (principal) return principal;
  redirect(chatGPTSignInPath(returnTo));
}
