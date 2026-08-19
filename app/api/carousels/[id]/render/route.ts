import { createCarouselRender } from "../../../../../lib/server/carousel-repository";
import { authorizeApi } from "../../../../../lib/server/request-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    return Response.json({ render: await createCarouselRender(id, authorization.principal.actor, authorization.principal.workspaceId) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to render carousel." }, { status: 400 });
  }
}
