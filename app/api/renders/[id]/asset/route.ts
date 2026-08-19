import { getRenderAsset } from "../../../../../lib/server/media-repository";
import { authorizeApi } from "../../../../../lib/server/request-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    const asset = await getRenderAsset(id, authorization.principal.workspaceId);
    if (!asset) return new Response("Not found", { status: 404 });
    const headers = new Headers();
    asset.writeHttpMetadata(headers);
    headers.set("etag", asset.httpEtag);
    headers.set("content-disposition", `inline; filename="nocanva-${id}.png"`);
    return new Response(asset.body, { headers });
  } catch {
    return new Response("Unable to read render asset.", { status: 500 });
  }
}
