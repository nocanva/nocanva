import { getRenderAsset } from "../../../../../lib/server/media-repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const asset = await getRenderAsset(id);
    if (!asset) return new Response("Not found", { status: 404 });
    const headers = new Headers();
    asset.writeHttpMetadata(headers);
    headers.set("etag", asset.httpEtag);
    headers.set("content-disposition", `inline; filename="framewise-${id}.png"`);
    return new Response(asset.body, { headers });
  } catch {
    return new Response("Unable to read render asset.", { status: 500 });
  }
}
