import { createCarousel, listCarousels } from "../../../lib/server/carousel-repository";
import { authorizeApi } from "../../../lib/server/request-auth";

export async function GET(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 30);
  return Response.json({ carousels: await listCarousels(Number.isFinite(limit) ? limit : 30, url.searchParams.get("includeArchived") === "true", authorization.principal.workspaceId) });
}

export async function POST(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    return Response.json({ carousel: await createCarousel(await request.json(), authorization.principal.actor, authorization.principal.workspaceId) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create carousel." }, { status: 400 });
  }
}
