import { authenticateManagedMcpToken } from "../../../../../lib/server/media-repository";
import { authorizeApi } from "../../../../../lib/server/request-auth";

export async function POST(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  if (authorization.principal.kind !== "service") return Response.json({ error: "Service authentication is required." }, { status: 403 });
  const body = await request.json() as { token?: unknown };
  if (typeof body.token !== "string") return Response.json({ error: "token is required." }, { status: 400 });
  const principal = await authenticateManagedMcpToken(body.token);
  if (!principal) return Response.json({ error: "Invalid or revoked token." }, { status: 401, headers: { "cache-control": "no-store" } });
  return Response.json({ principal }, { headers: { "cache-control": "no-store" } });
}
