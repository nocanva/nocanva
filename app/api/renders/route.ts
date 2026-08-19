import { createRender, listRenders } from "../../../lib/server/media-repository";
import { authorizeApi } from "../../../lib/server/request-auth";

export async function GET(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 30);
    return Response.json({ renders: await listRenders(Number.isFinite(limit) ? limit : 30, authorization.principal.workspaceId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to list renders." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const form = await request.formData();
    const payloadValue = form.get("payload");
    const pngValue = form.get("png");
    const parentValue = form.get("parentRenderId");
    const postValue = form.get("postId");
    const draftRevisionValue = form.get("draftRevisionId");
    const templateVersionValue = form.get("templateVersionId");
    if (typeof payloadValue !== "string" || !(pngValue instanceof File)) {
      return Response.json({ error: "payload and png are required" }, { status: 400 });
    }
    if (pngValue.type !== "image/png" || pngValue.size > 10 * 1024 * 1024) {
      return Response.json({ error: "png must be an image/png file no larger than 10 MB" }, { status: 400 });
    }

    const render = await createRender({
      payload: JSON.parse(payloadValue),
      png: await pngValue.arrayBuffer(),
      postId: typeof postValue === "string" && postValue ? postValue : null,
      draftRevisionId: typeof draftRevisionValue === "string" && draftRevisionValue ? draftRevisionValue : null,
      templateVersionId: typeof templateVersionValue === "string" && templateVersionValue ? templateVersionValue : null,
      parentRenderId: typeof parentValue === "string" && parentValue ? parentValue : null,
      createdBy: authorization.principal.actor,
    }, authorization.principal.workspaceId);
    return Response.json({ render }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create render." }, { status: 400 });
  }
}
