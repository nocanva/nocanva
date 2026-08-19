import { recordDraftReview, type DraftCheck } from "../../../../../lib/server/media-repository";
import { authorizeApi } from "../../../../../lib/server/request-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    const body = await request.json() as { expectedRevision?: unknown; reviewer?: unknown; notes?: unknown; checks?: unknown };
    if (!Number.isInteger(body.expectedRevision) || typeof body.reviewer !== "string" || !Array.isArray(body.checks)) {
      return Response.json({ error: "expectedRevision, reviewer, and checks are required." }, { status: 400 });
    }
    const checks = body.checks.filter((check): check is DraftCheck => Boolean(check) && typeof check === "object" && typeof (check as DraftCheck).id === "string" && typeof (check as DraftCheck).passed === "boolean" && typeof (check as DraftCheck).detail === "string");
    if (checks.length !== body.checks.length) return Response.json({ error: "Every review check must include id, passed, and detail." }, { status: 400 });
    const draft = await recordDraftReview(id, {
      expectedRevision: body.expectedRevision as number,
      reviewer: authorization.principal.kind === "local" ? body.reviewer : authorization.principal.actor,
      notes: typeof body.notes === "string" ? body.notes : null,
      checks,
    }, authorization.principal.workspaceId);
    return Response.json({ draft, review: draft.review });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to review draft.";
    return Response.json({ error: message }, { status: message.startsWith("Revision conflict") ? 409 : 400 });
  }
}
