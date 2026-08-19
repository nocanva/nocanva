import { createDraft, listDrafts } from "../../../lib/server/media-repository";
import { authorizeApi } from "../../../lib/server/request-auth";

export async function GET(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 30);
    const includeArchived = url.searchParams.get("includeArchived") === "true";
    return Response.json({ drafts: await listDrafts(Number.isFinite(limit) ? limit : 30, includeArchived, authorization.principal.workspaceId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to list drafts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const draft = await createDraft({ value: await request.json(), createdBy: authorization.principal.actor }, authorization.principal.workspaceId);
    return Response.json({ draft }, { status: 201, headers: { etag: `"draft-${draft.id}-${draft.currentRevision}"` } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create draft." }, { status: 400 });
  }
}
