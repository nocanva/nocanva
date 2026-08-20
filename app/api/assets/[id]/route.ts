import { archiveWorkspaceAsset, getWorkspaceAsset } from "../../../../lib/server/asset-repository";
import { authorizeApi } from "../../../../lib/server/request-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  const asset = await getWorkspaceAsset((await params).id, authorization.principal.workspaceId);
  return asset ? Response.json({ asset }) : Response.json({ error: "Image not found." }, { status: 404 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { archived } = await request.json() as { archived?: boolean };
    return Response.json({ asset: await archiveWorkspaceAsset((await params).id, archived !== false, authorization.principal.workspaceId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update image." }, { status: 400 });
  }
}
