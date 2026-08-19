import { getCarouselById, updateCarousel } from "../../../../lib/server/carousel-repository";
import { authorizeApi } from "../../../../lib/server/request-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  const carousel = await getCarouselById(id, authorization.principal.workspaceId);
  return carousel ? Response.json({ carousel }) : Response.json({ error: "Carousel not found." }, { status: 404 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    return Response.json({ carousel: await updateCarousel(id, await request.json(), authorization.principal.actor, authorization.principal.workspaceId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update carousel.";
    return Response.json({ error: message }, { status: message.startsWith("Revision conflict") ? 409 : 400 });
  }
}
