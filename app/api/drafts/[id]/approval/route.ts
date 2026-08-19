import { decideDraft } from "../../../../../lib/server/media-repository";
import { authorizeApi } from "../../../../../lib/server/request-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    const body = await request.json() as { expectedRevision?: unknown; actor?: unknown; decision?: unknown; notes?: unknown };
    if (!Number.isInteger(body.expectedRevision) || typeof body.actor !== "string") {
      return Response.json({ error: "expectedRevision and actor are required." }, { status: 400 });
    }
    const draft = await decideDraft(id, {
      expectedRevision: body.expectedRevision as number,
      actor: authorization.principal.kind === "local" ? body.actor : authorization.principal.actor,
      decision: body.decision,
      notes: typeof body.notes === "string" ? body.notes : null,
    }, authorization.principal.workspaceId);
    return Response.json({ draft, approval: draft.approval });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to decide draft.";
    return Response.json({ error: message }, { status: message.startsWith("Revision conflict") ? 409 : 400 });
  }
}
