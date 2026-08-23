import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { chatGPTSignInPath } from "../../app/chatgpt-auth";
import { auth } from "./auth";
import { resolvePrincipal, type NoCanvaPrincipal } from "./auth-policy";
import { getOrCreatePersonalWorkspace } from "./personal-workspace";

type AuthorizationResult =
  | { ok: true; principal: NoCanvaPrincipal }
  | { ok: false; response: Response };

function authMode(): "disabled" | "sites_private" | "cloudflare_access" | "better_auth" {
  if (env.NOCANVA_AUTH_MODE === "sites_private") return "sites_private";
  if (env.NOCANVA_AUTH_MODE === "cloudflare_access") return "cloudflare_access";
  if (env.NOCANVA_AUTH_MODE === "better_auth") return "better_auth";
  return "disabled";
}

export async function resolveNoCanvaPrincipal(requestHeaders: Headers): Promise<NoCanvaPrincipal | null> {
  const mode = authMode();
  const trustedPrincipal = await resolvePrincipal(requestHeaders, {
    mode,
    workspaceId: env.NOCANVA_WORKSPACE_ID,
    serviceToken: env.NOCANVA_APP_TOKEN,
  });
  if (trustedPrincipal) return trustedPrincipal;
  if (mode !== "better_auth") return null;

  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return null;
  const workspace = await getOrCreatePersonalWorkspace(session.user);
  return {
    kind: "better-auth-user",
    actor: `human:${session.user.id}`,
    workspaceId: workspace.id,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
  };
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
  if (authMode() === "sites_private") redirect(chatGPTSignInPath(returnTo));
  if (authMode() === "better_auth") redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  throw new Error("Cloudflare Access did not supply an authenticated identity.");
}
