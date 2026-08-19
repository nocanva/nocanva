import { getDraftById, listDraftRevisions } from "../../../../../lib/server/media-repository";
import { authorizeApi } from "../../../../../lib/server/request-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    if (!await getDraftById(id, authorization.principal.workspaceId)) return Response.json({ error: "Draft not found." }, { status: 404 });
    return Response.json({ revisions: await listDraftRevisions(id, authorization.principal.workspaceId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to list revisions." }, { status: 500 });
  }
}
