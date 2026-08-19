import { listCarouselRevisions } from "../../../../../lib/server/carousel-repository";
import { authorizeApi } from "../../../../../lib/server/request-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  return Response.json({ revisions: await listCarouselRevisions(id, authorization.principal.workspaceId) });
}
