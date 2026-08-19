import { revokeManagedMcpToken } from "../../../../lib/server/media-repository";
import { authorizeApi } from "../../../../lib/server/request-auth";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    return Response.json({ token: await revokeManagedMcpToken(id, authorization.principal.actor, authorization.principal.workspaceId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to revoke MCP token." }, { status: 400 });
  }
}
