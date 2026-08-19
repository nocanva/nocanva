import { createManagedMcpToken, listManagedMcpTokens } from "../../../lib/server/media-repository";
import { authorizeApi } from "../../../lib/server/request-auth";

export async function GET(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  return Response.json({ tokens: await listManagedMcpTokens(authorization.principal.workspaceId) });
}

export async function POST(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json() as { name?: unknown };
    if (typeof body.name !== "string") return Response.json({ error: "name is required." }, { status: 400 });
    return Response.json(await createManagedMcpToken(body.name, authorization.principal.actor, authorization.principal.workspaceId), { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create MCP token." }, { status: 400 });
  }
}
