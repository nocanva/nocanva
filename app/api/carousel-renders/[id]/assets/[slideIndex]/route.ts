import { getCarouselRenderAsset } from "../../../../../../lib/server/carousel-repository";
import { authorizeApi } from "../../../../../../lib/server/request-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; slideIndex: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  const { id, slideIndex } = await params;
  const index = Number(slideIndex);
  const asset = Number.isInteger(index) ? await getCarouselRenderAsset(id, index, authorization.principal.workspaceId) : null;
  if (!asset) return Response.json({ error: "Carousel slide not found." }, { status: 404 });
  const headers = new Headers({ "content-type": asset.httpMetadata?.contentType ?? "image/png", "cache-control": "private, max-age=31536000, immutable", etag: asset.httpEtag });
  if (new URL(request.url).searchParams.get("download") === "1") headers.set("content-disposition", `attachment; filename="nocanva-carousel-${id}-slide-${String(index + 1).padStart(2, "0")}.png"`);
  return new Response(asset.body, { headers });
}
