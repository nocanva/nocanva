import { getWorkspaceAssetBody } from "../../../../../lib/server/asset-repository";
import { authorizeApi } from "../../../../../lib/server/request-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  const asset = await getWorkspaceAssetBody((await params).id, authorization.principal.workspaceId);
  if (!asset) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  asset.writeHttpMetadata(headers);
  headers.set("etag", asset.httpEtag);
  headers.set("cache-control", "private, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  return new Response(asset.body, { headers });
}
