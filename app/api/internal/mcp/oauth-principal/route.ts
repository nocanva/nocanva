import { authorizeApi } from "../../../../../lib/server/request-auth";
import { getOrCreatePersonalWorkspaceForUserId } from "../../../../../lib/server/personal-workspace";

export async function POST(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  if (authorization.principal.kind !== "service") return Response.json({ error: "A service principal is required." }, { status: 403 });

  const body = await request.json().catch(() => null) as { userId?: unknown } | null;
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  if (!userId || userId.length > 128) return Response.json({ error: "A valid userId is required." }, { status: 400 });
  const workspace = await getOrCreatePersonalWorkspaceForUserId(userId);
  if (!workspace) return Response.json({ error: "The OAuth user no longer exists." }, { status: 401 });
  return Response.json({ principal: { id: `oauth:${userId}`, userId, workspaceId: workspace.id } }, { headers: { "cache-control": "no-store" } });
}
