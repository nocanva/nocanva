import { createTemplate, listTemplates } from "../../../lib/server/media-repository";
import { authorizeApi } from "../../../lib/server/request-auth";

export async function GET(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    return Response.json({ templates: await listTemplates(authorization.principal.workspaceId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to list templates." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    return Response.json({ template: await createTemplate(await request.json(), authorization.principal.workspaceId) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create template." }, { status: 400 });
  }
}
