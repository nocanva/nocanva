import { getDraftById, updateDraft } from "../../../../lib/server/media-repository";
import { authorizeApi } from "../../../../lib/server/request-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    const draft = await getDraftById(id, authorization.principal.workspaceId);
    if (!draft) return Response.json({ error: "Draft not found." }, { status: 404 });
    return Response.json({ draft }, { headers: { etag: `"draft-${draft.id}-${draft.currentRevision}"` } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to read draft." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    const draft = await updateDraft(id, { value: await request.json(), createdBy: authorization.principal.actor }, authorization.principal.workspaceId);
    return Response.json({ draft }, { headers: { etag: `"draft-${draft.id}-${draft.currentRevision}"` } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update draft.";
    return Response.json({ error: message }, { status: message.startsWith("Revision conflict") ? 409 : 400 });
  }
}
