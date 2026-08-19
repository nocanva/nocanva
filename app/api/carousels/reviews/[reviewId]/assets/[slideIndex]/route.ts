import { getCarouselReviewAsset } from "../../../../../../../lib/server/carousel-repository";
import { authorizeApi } from "../../../../../../../lib/server/request-auth";

export async function GET(request: Request, { params }: { params: Promise<{ reviewId: string; slideIndex: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  const { reviewId, slideIndex } = await params;
  const index = Number(slideIndex);
  const asset = Number.isInteger(index) ? await getCarouselReviewAsset(reviewId, index, authorization.principal.workspaceId) : null;
  if (!asset) return Response.json({ error: "Review slide not found." }, { status: 404 });
  return new Response(asset.body, { headers: { "content-type": asset.httpMetadata?.contentType ?? "image/png", "cache-control": "private, max-age=31536000, immutable", etag: asset.httpEtag } });
}
