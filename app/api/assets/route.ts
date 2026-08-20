import { createWorkspaceAsset, listWorkspaceAssets } from "../../../lib/server/asset-repository";
import { authorizeApi } from "../../../lib/server/request-auth";

export async function GET(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    return Response.json({ assets: await listWorkspaceAssets(authorization.principal.workspaceId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to list images." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File)) throw new Error("An image file is required.");
    const asset = await createWorkspaceAsset({ name: String(form.get("name") || image.name), bytes: await image.arrayBuffer(), createdBy: authorization.principal.actor }, authorization.principal.workspaceId);
    return Response.json({ asset }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to upload image." }, { status: 400 });
  }
}
