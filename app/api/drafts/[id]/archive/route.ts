import { setDraftArchived } from "../../../../../lib/server/media-repository";
import { authorizeApi } from "../../../../../lib/server/request-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    const body = await request.json() as { archived?: unknown };
    if (typeof body.archived !== "boolean") return Response.json({ error: "archived must be a boolean." }, { status: 400 });
    return Response.json({ draft: await setDraftArchived(id, body.archived, authorization.principal.actor, authorization.principal.workspaceId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to archive draft." }, { status: 400 });
  }
}
