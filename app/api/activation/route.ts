import { getActivationSummary } from "../../../lib/server/media-repository";
import { authorizeApi } from "../../../lib/server/request-auth";

export async function GET(request: Request) {
  const authorization = await authorizeApi(request);
  if (!authorization.ok) return authorization.response;
  try {
    return Response.json({ activation: await getActivationSummary(authorization.principal.workspaceId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to read activation metrics." }, { status: 500 });
  }
}
