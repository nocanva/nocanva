import { getCarouselRenderById } from "../../../../lib/server/carousel-repository";
import { authorizeApi } from "../../../../lib/server/request-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  const render = await getCarouselRenderById(id, authorization.principal.workspaceId);
  return render ? Response.json({ render }) : Response.json({ error: "Carousel render not found." }, { status: 404 });
}
