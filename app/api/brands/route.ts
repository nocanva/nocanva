import { createBrand, listBrands } from "../../../lib/server/media-repository";
import { authorizeApi } from "../../../lib/server/request-auth";

export async function GET(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    return Response.json({ brands: await listBrands(authorization.principal.workspaceId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to list brands." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    return Response.json({ brand: await createBrand(await request.json(), authorization.principal.workspaceId) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create brand." }, { status: 400 });
  }
}
