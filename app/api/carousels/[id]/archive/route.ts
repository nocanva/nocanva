import { archiveCarousel } from "../../../../../lib/server/carousel-repository";
import { authorizeApi } from "../../../../../lib/server/request-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    const body = await request.json() as { archived?: unknown };
    return Response.json({ carousel: await archiveCarousel(id, body.archived !== false, authorization.principal.actor, authorization.principal.workspaceId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to archive carousel." }, { status: 400 });
  }
}
