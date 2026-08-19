import { recordDraftReview, type DraftCheck } from "../../../../../lib/server/media-repository";
import { authorizeApi } from "../../../../../lib/server/request-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    const form = await request.formData();
    const expectedRevision = Number(form.get("expectedRevision"));
    const reviewer = form.get("reviewer");
    const notes = form.get("notes");
    const checksValue = form.get("checks");
    const png = form.get("png");
    if (!Number.isInteger(expectedRevision) || typeof reviewer !== "string" || typeof checksValue !== "string" || !(png instanceof File)) {
      return Response.json({ error: "expectedRevision, reviewer, checks, and png are required." }, { status: 400 });
    }
    if (png.type !== "image/png" || png.size > 10 * 1024 * 1024) return Response.json({ error: "png must be an image/png file no larger than 10 MB." }, { status: 400 });
    const checksValueParsed: unknown = JSON.parse(checksValue);
    if (!Array.isArray(checksValueParsed)) return Response.json({ error: "checks must be a JSON array." }, { status: 400 });
    const checks = checksValueParsed.filter((check): check is DraftCheck => Boolean(check) && typeof check === "object" && typeof (check as DraftCheck).id === "string" && typeof (check as DraftCheck).passed === "boolean" && typeof (check as DraftCheck).detail === "string");
    if (checks.length !== checksValueParsed.length) return Response.json({ error: "Every review check must include id, passed, and detail." }, { status: 400 });
    const draft = await recordDraftReview(id, {
      expectedRevision,
      reviewer: authorization.principal.kind === "local" ? reviewer : authorization.principal.actor,
      notes: typeof notes === "string" ? notes : null,
      checks,
      png: await png.arrayBuffer(),
    }, authorization.principal.workspaceId);
    return Response.json({ draft, review: draft.review });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to review draft.";
    return Response.json({ error: message }, { status: message.startsWith("Revision conflict") ? 409 : 400 });
  }
}
